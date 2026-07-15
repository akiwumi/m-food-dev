-- 025_north_star_telemetry_events.sql
-- Concept recovery Phase 0: make north-star metrics first-class operational
-- events instead of metadata-only fields on search_completed.

alter table public.events
  drop constraint if exists events_event_type_check;

alter table public.events
  add constraint events_event_type_check
  check (event_type in (
    'search_completed',
    'answered_from_mood_alone',
    'time_to_first_answer',
    'app_error'
  ));
