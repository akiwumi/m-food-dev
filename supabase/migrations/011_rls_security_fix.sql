-- 011_rls_security_fix.sql
-- Security hardening from the Supabase advisor scan (2026-06-14).
--
-- 1) CRITICAL — subscriptions / invite_codes / invite_redemptions each carried a
--    policy named "service role full access ..." created TO public with
--    USING(true) / WITH CHECK(true) FOR ALL. Because anon + authenticated hold
--    table grants and the anon key ships in the client bundle, ANY caller could
--    read and modify every user's billing + invite rows (e.g. self-grant a paid
--    subscription). service_role bypasses RLS regardless, so these policies were
--    pointless — drop them. The per-user "users read own ..." SELECT policies
--    remain; all writes go through edge functions using the service-role key.
drop policy if exists "service role full access on subscriptions"      on public.subscriptions;
drop policy if exists "service role full access on invite_codes"       on public.invite_codes;
drop policy if exists "service role full access on invite_redemptions" on public.invite_redemptions;

-- Keep RLS enforced (idempotent — already enabled, asserted for safety).
alter table public.subscriptions      enable row level security;
alter table public.invite_codes       enable row level security;
alter table public.invite_redemptions enable row level security;

-- 2) rls_auto_enable() is an event-trigger helper (auto-enables RLS on new public
--    tables). It must never be reachable over the REST RPC surface. The event
--    trigger fires as its owner, so revoking client EXECUTE is safe.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke all     on function public.rls_auto_enable() from public;

-- 3) can_view_community_post(uuid) is a SECURITY DEFINER policy helper used by the
--    community_posts / post_likes / post_comments RLS policies (all TO
--    authenticated), so authenticated MUST keep EXECUTE or the community feed
--    breaks. Remove only the needless anon/public direct-RPC exposure.
revoke all     on function public.can_view_community_post(uuid) from public;
revoke execute on function public.can_view_community_post(uuid) from anon;
grant  execute on function public.can_view_community_post(uuid) to authenticated;
