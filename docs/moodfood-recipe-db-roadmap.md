# MoodFood — Recipe Database Roadmap
**Strategy: Bulk seed (2,000 recipes) + live cache pipeline**

---

## Implementation status (2026-06-16)

This roadmap was written for a Next.js/Spoonacular setup. The actual app is **Vite +
React + Supabase Edge Functions (Deno)**, project ref `pjfoiamcflimdreoxvpg`. It has
been **adapted to that stack** rather than copied literally:

- **Schema** → migration [`015_recipe_cache.sql`](../supabase/migrations/015_recipe_cache.sql):
  `cached_recipes`, `recipe_searches`, GIN indexes, `increment_search_count`, a tag-unioning
  `upsert_recipes` RPC, RLS, and a retention prune (mirrors the 012–014 governance pattern).
  **Named `cached_recipes`** because the pilot schema (001) already has an unrelated
  authored-content `recipes` table with FK dependents — left untouched.
- **Cache-first layer** → lives **inside the `recipes` edge function** (the single
  server-side recipe source), not a client `lib/recipes.ts`. See
  [`cache.ts`](../supabase/functions/recipes/cache.ts) + [`tags.ts`](../supabase/functions/recipes/tags.ts)
  and the integration in [`index.ts`](../supabase/functions/recipes/index.ts). It is
  cache-first only for the relaxable mood feed; explicit filtered searches still go to
  the provider (and write through to the cache). Cached rows are re-run through the same
  per-user allergen/diet safety filter before serving.
- **Mood tags** → the app's mood vocabulary (`Tired`, `Happy`, `Anxious`, … + `Cozy`)
  is normalized to the 7 canonical seed moods in `tags.ts` (resolves the pre-launch note
  below). Covered by `src/recipeCache.test.ts`.
- **Bulk seed** → [`scripts/seed-recipes.mjs`](../scripts/seed-recipes.mjs) (Node ESM,
  writes through `upsert_recipes`). **Not yet run** — needs the service-role +
  Spoonacular keys and spends provider quota.
- **Phase 3** → [`recipes-top-up`](../supabase/functions/recipes-top-up/index.ts) edge
  function + analytics views in [`016_recipe_analytics.sql`](../supabase/migrations/016_recipe_analytics.sql).
  Cron wiring is documented (manual) in that migration.

**Remaining live steps (require secrets / spend / prod writes):** apply migrations 015 +
016, deploy the two functions, run the seed, then schedule the top-up cron.

---

## Overview

| | Detail |
|---|---|
| **Goal** | Build an owned recipe DB that reduces external API dependency over time |
| **Approach** | Pre-seed 2,016 recipes at launch, then auto-cache every live search |
| **Stack** | Next.js · Supabase · Spoonacular API |
| **Target** | 80–85% cache hit rate once DB matures |

---

## Supabase Schema

### `recipes` table

```sql
create table recipes (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique,
  source_api      text,                  -- 'spoonacular' | 'edamam'
  title           text not null,
  image_url       text,
  ready_in_minutes int,
  servings        int,

  -- MoodFood-specific tags
  mood_tags       text[],                -- ['anxious', 'low_energy', 'happy']
  dietary_tags    text[],                -- ['vegan', 'gluten-free']
  cuisine_type    text,
  meal_type       text,                  -- 'breakfast' | 'lunch' | 'dinner' | 'snack'

  -- Raw API response (keeps options open for future reshaping)
  raw_data        jsonb,

  -- Popularity tracking
  search_count    int default 0,
  last_fetched_at timestamptz default now(),
  created_at      timestamptz default now()
);

-- Fast GIN indexes for array filtering
create index on recipes using gin(mood_tags);
create index on recipes using gin(dietary_tags);
```

### `recipe_searches` table

```sql
create table recipe_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  mood        text,
  dietary     text[],
  query       text,
  result_ids  uuid[],           -- which recipes were returned
  served_from text,             -- 'cache' | 'api'
  searched_at timestamptz default now()
);
```

---

## Phase 1 — Supabase Schema + Bulk Seed Script

> **Goal:** 2,016 recipes across all mood × diet combinations before launch day.

### Seed matrix — 7 moods × 6 diets × ~48 recipes = 2,016 total

| | `none` | `vegan` | `vegetarian` | `gluten-free` | `keto` | `dairy-free` |
|---|---|---|---|---|---|---|
| 😊 happy | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |
| 😰 anxious | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |
| 😴 tired | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |
| 😤 stressed | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |
| ⚡ energised | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |
| 😢 sad | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |
| 🎯 focused | ~48 | ~48 | ~48 | ~48 | ~48 | ~48 |

> `onConflict: 'external_id'` upsert means re-running the script is always safe — no duplicates.

### Checklist

- [x] Create `recipes` table in Supabase — migration `015` (written; **not yet applied**)
- [x] Create `recipe_searches` log table — migration `015`
- [x] Add GIN indexes on `mood_tags` and `dietary_tags` — migration `015`
- [x] Write bulk seed script — `scripts/seed-recipes.mjs` (Node ESM, not `.ts`)
- [ ] Set `SPOONACULAR_API_KEY` (already a Supabase secret; also needed in the seed shell env)
- [ ] Run seed script — hits API across 42 combinations *(deferred: spends quota + writes prod)*

### Seed script — `scripts/seed-recipes.ts`

```typescript
const MOODS = [
  'happy', 'anxious', 'tired',
  'stressed', 'energised', 'sad', 'focused'
];

const DIETS = [
  'none', 'vegan', 'vegetarian',
  'gluten-free', 'keto', 'dairy-free'
];

async function seedRecipes() {
  let total = 0;

  for (const mood of MOODS) {
    for (const diet of DIETS) {
      // ~48 recipes per combo → 2,016 total
      const results = await fetchSpoonacular(mood, diet, 48);

      await supabase.from('recipes').upsert(
        results.map(r => ({
          external_id:  r.id.toString(),
          source_api:   'spoonacular',
          title:        r.title,
          image_url:    r.image,
          mood_tags:    [mood],
          dietary_tags: diet === 'none' ? [] : [diet],
          raw_data:     r,
        })),
        { onConflict: 'external_id' }
      );

      total += results.length;
      console.log(`✓ ${mood} + ${diet}: ${results.length} recipes (${total} total)`);
      await sleep(400); // respect Spoonacular rate limits
    }
  }

  console.log(`Seed complete: ${total} recipes`);
}

seedRecipes();
```

Run with:
```bash
npx ts-node scripts/seed-recipes.ts
```

---

## Phase 2 — Cache-First API Layer

> **Goal:** Every live user search auto-saves to DB. The external API is only called on a cache miss.

### Request flow

```
User search
    │
    ▼
Check DB ──── ≥6 results? ──── YES ──▶ Serve from cache ──▶ Return result
    │
   NO
    │
    ▼
Call Spoonacular API
    │
    ▼
Save result to DB (upsert)
    │
    ▼
Return result to user
```

### Checklist

- [x] Cache-first helper — `cache.ts` in the `recipes` edge function (not client `lib/`)
- [x] Single recipe source already routes through the edge function — cache added there
- [x] Log `served_from: 'cache' | 'api' | 'themealdb' | 'none'` on every search
- [x] Increment `search_count` on cache hits (fire-and-forget)

### Cache-first helper — `lib/recipes.ts`

```typescript
export async function getRecipes(mood: string, diets: string[]) {

  // 1 — check your own DB first
  const { data: cached } = await supabase
    .from('recipes')
    .select('*')
    .contains('mood_tags', [mood])
    .contains('dietary_tags', diets)
    .order('search_count', { ascending: false })
    .limit(12);

  if (cached && cached.length >= 6) {
    // Increment search_count in background — don't block the response
    incrementCount(cached.map(r => r.id));
    return { recipes: cached, source: 'cache' };
  }

  // 2 — fall back to external API
  const fresh = await fetchSpoonacular(mood, diets);

  // 3 — save to DB before returning (upsert avoids duplicates)
  await supabase.from('recipes').upsert(
    fresh.map(r => ({
      external_id:  r.id.toString(),
      source_api:   'spoonacular',
      title:        r.title,
      image_url:    r.image,
      mood_tags:    [mood],
      dietary_tags: diets,
      raw_data:     r,
    })),
    { onConflict: 'external_id' }
  );

  return { recipes: fresh, source: 'api' };
}

// Fire-and-forget — doesn't block the response
async function incrementCount(ids: string[]) {
  await supabase.rpc('increment_search_count', { recipe_ids: ids });
}
```

### Supabase RPC for count increment

```sql
create or replace function increment_search_count(recipe_ids uuid[])
returns void as $$
  update recipes
  set search_count = search_count + 1
  where id = any(recipe_ids);
$$ language sql;
```

---

## Phase 3 — Mature DB + API Independence

> **Goal:** 5,000+ recipes, ~85% cache hit rate, near-zero API spend. DB becomes the product.

### Target metrics

| Metric | Target |
|---|---|
| Cache hit rate | ~85% |
| API calls reduced | ↓ 85% |
| Total recipes in DB | 5,000+ |
| Monthly top-up | Automated via Vercel Cron |

### Checklist

- [x] Monthly top-up job — `recipes-top-up` edge function + pg_cron (cron wiring documented in `016`)
- [x] Cache-hit-rate dashboard — `recipe_cache_hit_rate_7d` view (+ `recipe_top_combos`, `recipe_prune_candidates`) in `016`
- [ ] Surface `search_count` as a "trending" signal in the UI
- [ ] Feed user saves/favourites back into the popularity score
- [ ] Prune `raw_data` jsonb to reduce storage once fields are stable
- [ ] Add a rate-limit guard: skip the external API call if monthly credits are low

### Monthly top-up cron — `app/api/cron/top-up/route.ts`

```typescript
// vercel.json → { "crons": [{ "path": "/api/cron/top-up", "schedule": "0 0 1 * *" }] }

export async function GET() {
  const MOODS = ['happy','anxious','tired','stressed','energised','sad','focused'];
  const DIETS = ['none','vegan','vegetarian','gluten-free','keto','dairy-free'];

  for (const mood of MOODS) {
    for (const diet of DIETS) {
      // Only fetch combos with fewer than 60 cached recipes
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .contains('mood_tags', [mood])
        .contains('dietary_tags', diet === 'none' ? [] : [diet]);

      if ((count ?? 0) < 60) {
        const fresh = await fetchSpoonacular(mood, diet, 20);
        await supabase.from('recipes').upsert(fresh, { onConflict: 'external_id' });
      }
    }
  }

  return Response.json({ ok: true });
}
```

### Analytics queries

```sql
-- Cache hit rate this week
SELECT
  served_from,
  COUNT(*) AS searches,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM recipe_searches
WHERE searched_at > NOW() - INTERVAL '7 days'
GROUP BY served_from;

-- Top 10 most searched mood + diet combos
SELECT mood, dietary_tags, SUM(array_length(result_ids, 1)) AS hits
FROM recipe_searches
GROUP BY mood, dietary_tags
ORDER BY hits DESC
LIMIT 10;

-- Recipes never served (candidates for pruning)
SELECT id, title, mood_tags, dietary_tags
FROM recipes
WHERE search_count = 0
AND created_at < NOW() - INTERVAL '90 days';
```

---

## Pre-launch note on mood tags

Before running the seed script, confirm that your psychological profiling / onboarding system maps directly to the 7 mood tags above — or add a translation layer:

```typescript
// Example: map onboarding moods to seed tags
const MOOD_MAP: Record<string, string> = {
  'overstimulated':  'anxious',
  'low motivation':  'tired',
  'burned out':      'stressed',
  'content':         'happy',
  'in the zone':     'focused',
};
```

Locking the tags before seeding means the DB structure matches your onboarding flow from day one.

---

*MoodFood · Recipe DB Roadmap · Last updated June 2026*
