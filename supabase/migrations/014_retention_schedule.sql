-- 014_retention_schedule.sql
-- Slice 1.5: the AUTOMATED expiry job the Data Governance gate requires — raw
-- operational events do not live forever. Schedules public.prune_old_events (from
-- 013) to run daily at 03:00 UTC via pg_cron. Idempotent: re-running re-points the
-- single named job rather than stacking duplicates.

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'prune-events-daily') then
    perform cron.unschedule('prune-events-daily');
  end if;
end
$$;

select cron.schedule('prune-events-daily', '0 3 * * *', $$select public.prune_old_events(90);$$);
