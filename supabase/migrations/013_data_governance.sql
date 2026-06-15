-- 013_data_governance.sql
-- Slice 1.5 of the AI Learning Roadmap (v3): the Data Governance gate. This is a
-- HARD PREREQUISITE for any server-side *behavioural* event capture (Slice 2).
--
-- It ships three things:
--   1. Consent of record — an explicit, granular, versioned opt-in (default OFF).
--   2. A server-side gate (`has_consent`) used to reject behavioural writes that
--      no recorded consent authorizes.
--   3. Retention — an idempotent expiry function for raw operational events.
--
-- Deletion & export are enforced in the edge functions (`delete-account`,
-- `export-data`). Deletion completeness rests on a schema invariant verified in
-- this milestone: every public FK to auth.users is ON DELETE CASCADE, so deleting
-- the auth user removes every row. The table below preserves that invariant.

-- ── Consent of record ────────────────────────────────────────────────────────
-- One row per (user, scope) holding the user's CURRENT decision, with the policy
-- version and the moment they decided. Default state is "no row" = not granted.
-- Scopes are deliberately granular so a user can allow recommendation learning
-- without consenting to mood/health-adjacent context being retained for learning.
create table if not exists public.consents (
  user_id    uuid not null references auth.users(id) on delete cascade,
  scope      text not null check (scope in ('behavioral_learning', 'mood_health_context')),
  granted    boolean not null default false,
  version    text not null,                 -- consent-copy version the user agreed to
  decided_at timestamptz not null default now(),
  primary key (user_id, scope)
);

alter table public.consents enable row level security;
drop policy if exists "consents own" on public.consents;
create policy "consents own" on public.consents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Server-side consent gate ─────────────────────────────────────────────────
-- Used by behavioural-write paths (Slice 2 edge functions, via service role) to
-- reject events that no granted consent authorizes. SECURITY DEFINER with a locked
-- search_path; not exposed to anon/authenticated as a direct RPC.
create or replace function public.has_consent(p_user uuid, p_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.consents
    where user_id = p_user and scope = p_scope and granted
  );
$$;
revoke all on function public.has_consent(uuid, text) from public, anon, authenticated;

-- ── Retention: idempotent expiry for raw operational events ──────────────────
-- Raw events are short-lived; derived aggregates (later slices) carry last_observed
-- + decay and may live longer. Default window 90 days. Safe to run repeatedly.
create or replace function public.prune_old_events(retention_days int default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted int;
begin
  delete from public.events where event_time < now() - make_interval(days => greatest(retention_days, 1));
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
revoke all on function public.prune_old_events(int) from public, anon, authenticated;
