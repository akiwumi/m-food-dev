-- 022_social_grants_fix.sql — two schema-permission fixes for the social layer,
-- both found by an end-to-end test against the live project.
--
-- 1. Migration 008 revoked table-level UPDATE on public.profiles and re-granted a
--    COLUMN allow-list (billing columns stay webhook-only). That allow-list
--    naturally predates food_profile_public, so the client's food-profile publish
--    — which powers friend profiles and food-based suggestions — was denied with
--    42501. Add the column to the grant. RLS ("profiles own") still scopes writes
--    to the owner's row.
grant update (food_profile_public) on public.profiles to authenticated;

-- 2. Migration 004 constrained avatar_url to a bare storage PATH (<uid>/…). Since
--    020 made the avatars bucket public, the client now stores the resolved
--    PUBLIC URL (rendered directly in search results and the feed). Relax the
--    constraint to accept either form, still scoped to the owner's own folder so
--    a user can't point their avatar at someone else's object.
alter table public.profiles drop constraint if exists profiles_avatar_owner_path;
alter table public.profiles add constraint profiles_avatar_owner_path
  check (avatar_url is null
    or avatar_url like id::text || '/%'
    or avatar_url like '%/avatars/' || id::text || '/%');
