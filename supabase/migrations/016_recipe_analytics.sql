-- 016_recipe_analytics.sql
-- Recipe DB Roadmap — Phase 3 analytics + maintenance scheduling.
--
-- Read-only admin views over the cache + search log (cache-hit-rate dashboard,
-- trending combos, pruning candidates), plus the documented pg_cron wiring for the
-- monthly `recipes-top-up` edge function.
--
-- The views are admin/ops tooling only — they aggregate across ALL users, so they
-- are NOT granted to anon/authenticated. Query them with the service role or from
-- the Supabase SQL editor.

-- ── Cache hit rate over the last 7 days ──────────────────────────────────────
create or replace view public.recipe_cache_hit_rate_7d as
select
  served_from,
  count(*)                                                    as searches,
  round(count(*) * 100.0 / nullif(sum(count(*)) over (), 0), 1) as pct
from public.recipe_searches
where searched_at > now() - interval '7 days'
group by served_from;

-- ── Most-searched mood + diet combos ─────────────────────────────────────────
create or replace view public.recipe_top_combos as
select mood, dietary, count(*) as searches
from public.recipe_searches
group by mood, dietary
order by searches desc
limit 50;

-- ── Recipes never served (pruning candidates) ────────────────────────────────
create or replace view public.recipe_prune_candidates as
select id, title, source_api, mood_tags, dietary_tags, created_at
from public.cached_recipes
where search_count = 0
  and created_at < now() - interval '90 days';

-- Keep the cross-user aggregates off the client roles.
revoke all on public.recipe_cache_hit_rate_7d  from anon, authenticated;
revoke all on public.recipe_top_combos         from anon, authenticated;
revoke all on public.recipe_prune_candidates   from anon, authenticated;

-- ── Monthly top-up schedule (Phase 3) ────────────────────────────────────────
-- The top-up runs as the `recipes-top-up` edge function (it needs the Spoonacular
-- secret, which only lives in the edge runtime). pg_cron triggers it via net.http_post.
-- This requires, AFTER deploying the function and setting its secrets:
--   1. supabase functions deploy recipes-top-up
--   2. supabase secrets set SPOONACULAR_API_KEY=... RECIPES_TOPUP_SECRET=<random>
--   3. create extension if not exists pg_net;
--   4. store the secret in Vault so it is not written in plaintext SQL:
--        select vault.create_secret('<RECIPES_TOPUP_SECRET>', 'recipes_topup_secret');
--   5. schedule it (1st of each month, 00:00 UTC):
--
--   select cron.schedule(
--     'recipes-top-up-monthly', '0 0 1 * *',
--     $cron$
--       select net.http_post(
--         url     := 'https://pjfoiamcflimdreoxvpg.functions.supabase.co/recipes-top-up',
--         headers := jsonb_build_object(
--           'content-type', 'application/json',
--           'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'recipes_topup_secret')
--         ),
--         body    := '{}'::jsonb
--       );
--     $cron$
--   );
--
-- Left as documented manual steps (not auto-applied) because the function URL and
-- secret must exist first, and Vault writes don't belong in a committed migration.
