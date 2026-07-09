# Recipe DB — Seed + Monthly Top-Up Runbook

Operational steps to bring the owned recipe cache (`cached_recipes`) live: apply the
schema, bulk-seed ~2,000 recipes, then schedule the monthly top-up cron.

Project ref: `pjfoiamcflimdreoxvpg` · Stack: Vite + React + Supabase Edge Functions (Deno)

> **Order matters.** Migrations 015 + 016 must be applied before anything else — the
> seed script depends on the `upsert_recipes` RPC from 015, and the cron analytics/wiring
> live in 016. Full sequence:
> `migrations 015+016 → seed → deploy function → set secrets → pg_net + Vault → cron.schedule → smoke test`

---

## Prerequisites (one-time)

1. **Apply the two migrations** to prod so `cached_recipes` + the `upsert_recipes` RPC exist:
   - `supabase/migrations/015_recipe_cache.sql`
   - `supabase/migrations/016_recipe_analytics.sql`
   - Use `supabase db push` (CLI, linked to the project) or paste each into the SQL editor.

2. **Keys on hand:**
   - `SUPABASE_SERVICE_ROLE_KEY` → Dashboard → Project Settings → API → `service_role` (secret).
   - `SPOONACULAR_API_KEY` → your Spoonacular account.

---

## Task 1 — Bulk seed (~2,016 recipes)

Script: `scripts/seed-recipes.mjs`. Makes **42 Spoonacular `complexSearch` calls**
(7 moods × 6 diets, ~48 each) with full nutrition/instructions — heavyweight calls, so
**check your Spoonacular quota first.**

Run from the repo root, passing env vars inline (never commit them):

```bash
SUPABASE_URL="https://pjfoiamcflimdreoxvpg.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key>" \
SPOONACULAR_API_KEY="<spoonacular key>" \
node scripts/seed-recipes.mjs
```

- Prints `✓ mood + diet: N recipes (running total)` per combo, then `Seed complete: N recipes upserted.`
- **Idempotent** — re-running is safe (upsert on `external_id`; tags accumulate, never shrink).
  If some combos fail (`✗ …`), just re-run; only thin combos do real work.
- Verify: `select count(*) from cached_recipes;` (expect ~2,000, minus recipes dropped by
  the complete-instructions filter).

---

## Task 2 — Schedule the monthly top-up cron

The cron triggers the `recipes-top-up` edge function (it holds the Spoonacular secret;
pg_cron can't call Spoonacular directly). It tops up any mood × diet combo below 60
cached recipes.

### 1. Deploy the function
```bash
supabase functions deploy recipes-top-up
```

### 2. Set its secrets
Generate a long random string for the cron secret (e.g. `openssl rand -hex 32`):
```bash
supabase secrets set SPOONACULAR_API_KEY="<spoonacular key>" \
  RECIPES_TOPUP_SECRET="<long-random-string>"
```
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

### 3. Enable pg_net + stash the secret in Vault (SQL editor)
Keeps the secret out of plaintext cron SQL:
```sql
create extension if not exists pg_net;
select vault.create_secret('<the same RECIPES_TOPUP_SECRET>', 'recipes_topup_secret');
```

### 4. Schedule it (1st of each month, 00:00 UTC)
```sql
select cron.schedule(
  'recipes-top-up-monthly', '0 0 1 * *',
  $cron$
    select net.http_post(
      url     := 'https://pjfoiamcflimdreoxvpg.functions.supabase.co/recipes-top-up',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'recipes_topup_secret')
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
```

### 5. Smoke-test now (don't wait a month)
```bash
curl -X POST https://pjfoiamcflimdreoxvpg.functions.supabase.co/recipes-top-up \
  -H "x-cron-secret: <RECIPES_TOPUP_SECRET>"
```
Expect `{"ok":true,"toppedUp":…,"added":…,"skipped":…}`. Right after a full seed most
combos are ≥60, so a healthy run mostly shows `skipped` — that's correct, it only fetches
for thin combos.
- `401` → header/secret mismatch.
- `503` → cache disabled or Spoonacular key not set.

### 6. Verify the schedule registered
```sql
select jobname, schedule from cron.job;   -- expect 'recipes-top-up-monthly' / '0 0 1 * *'
```

---

## Quota note

Both the seed and the first top-up spend Spoonacular quota. If quota is tight: run the
seed, confirm the row count, do the cron wiring, and **skip the manual curl test** — let
the 1st-of-month run be the first real top-up.

---

## Removing / changing the schedule

```sql
select cron.unschedule('recipes-top-up-monthly');
```
Then re-run step 4 with a new cron expression if needed.

---

*MoodFood · Recipe seed + top-up runbook · 2026-06-16*
