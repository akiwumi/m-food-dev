-- 012_telemetry_events.sql
-- Slice 0 of the AI Learning Roadmap (v3): "Make Measurement Exist".
--
-- MoodFood has no telemetry today. This adds a single, generic operational-event
-- sink so we can establish baselines for search latency, empty-result rate, and
-- provider/AI behaviour *before* changing the search default or building any
-- behavioural learning.
--
-- Scope is deliberately narrow. The Data Governance gate (roadmap Slice 1.5)
-- forbids writing *behavioural* events (opens, saves, cooks, ratings) server-side
-- until consent / retention / deletion controls are live. So this table only
-- accepts NON-PERSONAL OPERATIONAL events: search timing and outcomes. The
-- constraints below enforce that at the database level — engagement event types
-- and a non-operational category are rejected until a later migration (shipped
-- with the consent infrastructure) widens them on purpose.

create table if not exists public.events (
  id                     uuid primary key,                               -- client-generated → idempotent re-sends are ignored
  user_id                uuid not null references auth.users(id) on delete cascade,
  event_type             text not null check (event_type in ('search_completed')),
  category               text not null default 'operational' check (category = 'operational'),
  event_time             timestamptz not null,                           -- when it happened (client clock)
  received_at            timestamptz not null default now(),             -- server receipt (trusted clock)
  duration_ms            integer check (duration_ms is null or duration_ms >= 0),
  value                  double precision,                               -- generic numeric (e.g. result_count)
  source                 text,                                           -- provider source: spoonacular | themealdb | local
  ranking_config_version text,
  metadata               jsonb not null default '{}'::jsonb              -- minimal, controlled fields only
);

-- Aggregation reads: by event type over time (fleet baselines) and per user
-- (cost / behaviour per active user, and cascade deletes).
create index if not exists events_type_time_idx on public.events (event_type, event_time desc);
create index if not exists events_user_time_idx on public.events (user_id, event_time desc);

-- RLS: a user may only read and write their own events. (The auto-enable event
-- trigger from 004 already turns RLS on for new public tables; we assert it and
-- add the policy explicitly so this migration is self-contained and idempotent.)
alter table public.events enable row level security;
drop policy if exists "events own" on public.events;
create policy "events own" on public.events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
