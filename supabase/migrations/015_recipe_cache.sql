-- 015_recipe_cache.sql
-- Recipe DB Roadmap — Phase 1 + Phase 2 schema.
--
-- Today the `recipes` edge function is the ONLY recipe source: every search hits
-- Spoonacular (then TheMealDB) live. This migration adds an owned cache so the DB
-- can serve most searches itself over time and external-API dependency shrinks.
--
--   public.cached_recipes   — the owned catalog / cache (one row per provider recipe)
--   public.recipe_searches  — a thin search log for cache-hit-rate analytics
--   increment_search_count  — atomic popularity bump (fire-and-forget on cache hits)
--   upsert_recipes          — idempotent, tag-unioning write-through (seed + live)
--
-- NOTE on the name: the roadmap calls this table `recipes`, but the pilot schema
-- (001) already has a `public.recipes` table for AUTHORED content (a different shape,
-- with FK dependents). To avoid clobbering it, the owned external-recipe cache lives
-- in `public.cached_recipes`.
--
-- Design choices for THIS stack:
--   * raw_data holds the FULL normalized recipe the function already returns to the
--     client, so a cache read is ready to serve with no reshaping.
--   * external_id is the provider id (Spoonacular numeric id as text, or "mealdb-<id>").
--     UNIQUE on it makes the seed + write-through upserts idempotent (re-runnable).
--   * Writes happen ONLY via the edge function's service-role client, so RLS locks
--     the tables to read-only for end users (catalog) / own-rows (search log).
--   * recipe_searches.user_id is on delete set null + pruned, matching the Data
--     Governance gate (013/014): analytics survive account deletion without keeping
--     identity, and the log does not accumulate forever.

-- ── cached_recipes: the owned catalog / cache ────────────────────────────────
create table if not exists public.cached_recipes (
  id               uuid primary key default gen_random_uuid(),
  external_id      text not null unique,            -- 'spoonacular' numeric id, or 'mealdb-<id>'
  source_api       text not null,                   -- 'spoonacular' | 'themealdb'
  title            text not null,
  image_url        text,
  ready_in_minutes int,
  servings         int,

  -- MoodFood-specific tags for array filtering
  mood_tags        text[] not null default '{}',    -- ['happy','anxious',...]
  dietary_tags     text[] not null default '{}',    -- ['vegan','gluten-free',...]
  cuisine_type     text,
  meal_type        text,                            -- 'breakfast' | 'lunch' | 'dinner' | 'snack'

  -- The full normalized recipe object the function serves to the client.
  raw_data         jsonb not null,

  -- Popularity tracking
  search_count     int not null default 0,
  last_fetched_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- Fast GIN indexes for array filtering, plus popularity ordering on reads.
create index if not exists cached_recipes_mood_tags_idx    on public.cached_recipes using gin (mood_tags);
create index if not exists cached_recipes_dietary_tags_idx on public.cached_recipes using gin (dietary_tags);
create index if not exists cached_recipes_search_count_idx on public.cached_recipes (search_count desc);

-- RLS: a shared, non-personal catalog. Authenticated users may READ it; only the
-- service role (edge function / seed script) writes — service role bypasses RLS,
-- and the absence of any insert/update policy denies client writes.
alter table public.cached_recipes enable row level security;
drop policy if exists "cached_recipes readable by authenticated" on public.cached_recipes;
create policy "cached_recipes readable by authenticated" on public.cached_recipes
  for select to authenticated using (true);

-- ── recipe_searches: thin analytics log ──────────────────────────────────────
create table if not exists public.recipe_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  mood        text,
  dietary     text[] not null default '{}',
  query       text,
  result_ids  uuid[] not null default '{}',         -- which cached recipes were returned
  served_from text check (served_from in ('cache', 'api', 'themealdb', 'none')),
  searched_at timestamptz not null default now()
);

create index if not exists recipe_searches_served_idx on public.recipe_searches (served_from, searched_at desc);
create index if not exists recipe_searches_user_idx   on public.recipe_searches (user_id, searched_at desc);

-- RLS: a user may read their own search rows; only the service role inserts.
alter table public.recipe_searches enable row level security;
drop policy if exists "recipe_searches own" on public.recipe_searches;
create policy "recipe_searches own" on public.recipe_searches
  for select to authenticated using (auth.uid() = user_id);

-- ── increment_search_count: atomic popularity bump ───────────────────────────
-- Called fire-and-forget by the edge function (service role) on every cache hit.
-- SECURITY DEFINER with a locked search_path; not exposed to anon/authenticated.
create or replace function public.increment_search_count(recipe_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.cached_recipes
  set search_count = search_count + 1,
      last_fetched_at = now()
  where id = any(recipe_ids);
$$;
revoke all on function public.increment_search_count(uuid[]) from public, anon, authenticated;

-- ── upsert_recipes: idempotent write-through that UNIONS tags ─────────────────
-- The seed and the live write-through both call this. A plain upsert would replace
-- mood_tags/dietary_tags, so a recipe first seen under "happy" then re-fetched under
-- "tired" would lose "happy" — shrinking the seed's coverage. Unioning the tag
-- arrays means each recipe accumulates the moods/diets it has ever matched, so the
-- cache gets BROADER (more hittable) every time, never narrower.
create or replace function public.upsert_recipes(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cached_recipes as r (
    external_id, source_api, title, image_url, ready_in_minutes, servings,
    mood_tags, dietary_tags, cuisine_type, meal_type, raw_data, last_fetched_at
  )
  select
    x.external_id, x.source_api, x.title, x.image_url, x.ready_in_minutes, x.servings,
    coalesce(x.mood_tags, '{}'), coalesce(x.dietary_tags, '{}'),
    x.cuisine_type, x.meal_type, x.raw_data, now()
  from jsonb_to_recordset(payload) as x(
    external_id text, source_api text, title text, image_url text,
    ready_in_minutes int, servings int, mood_tags text[], dietary_tags text[],
    cuisine_type text, meal_type text, raw_data jsonb
  )
  where x.external_id is not null and x.title is not null and x.raw_data is not null
  on conflict (external_id) do update set
    title           = excluded.title,
    image_url       = excluded.image_url,
    ready_in_minutes = excluded.ready_in_minutes,
    servings        = excluded.servings,
    cuisine_type    = coalesce(excluded.cuisine_type, r.cuisine_type),
    meal_type       = coalesce(excluded.meal_type, r.meal_type),
    raw_data        = excluded.raw_data,
    last_fetched_at = now(),
    mood_tags       = (select array(select distinct e from unnest(r.mood_tags    || excluded.mood_tags)    e where e is not null and e <> '')),
    dietary_tags    = (select array(select distinct e from unnest(r.dietary_tags || excluded.dietary_tags) e where e is not null and e <> ''));
end;
$$;
revoke all on function public.upsert_recipes(jsonb) from public, anon, authenticated;

-- ── Retention: keep the search log bounded (Data Governance gate) ─────────────
-- The search log is operational/behavioural and must not live forever. Default
-- window 180 days. Safe to run repeatedly.
create or replace function public.prune_old_recipe_searches(retention_days int default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted int;
begin
  delete from public.recipe_searches
  where searched_at < now() - make_interval(days => greatest(retention_days, 1));
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
revoke all on function public.prune_old_recipe_searches(int) from public, anon, authenticated;

-- Schedule the prune daily at 03:30 UTC (just after the events prune at 03:00).
-- Idempotent: re-running re-points the single named job rather than stacking it.
create extension if not exists pg_cron;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'prune-recipe-searches-daily') then
    perform cron.unschedule('prune-recipe-searches-daily');
  end if;
end
$$;
select cron.schedule('prune-recipe-searches-daily', '30 3 * * *', $$select public.prune_old_recipe_searches(180);$$);
