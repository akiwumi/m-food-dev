-- 008_subscription_columns.sql — columns the Stripe trial → charge flow needs.
-- These live on public.profiles so each user's billing state travels with them.
-- The browser may READ these (own row via RLS) but must never WRITE them — only
-- the Stripe webhook (service role, bypasses RLS) flips subscription_status.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists plan text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_reminder_sent_at timestamptz;

-- Constrain the status to the same values the pilot used in src/store.ts,
-- plus 'past_due' for failed renewals.
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;
alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('none', 'trialing', 'active', 'canceled', 'past_due'));

-- Browser clients must never directly mutate billing columns. RLS already
-- restricts rows to the owner; this column-level revoke stops the owner from
-- editing their own billing fields. The webhook uses the service role.
revoke update on public.profiles from authenticated;
grant update (
  display_name, onboarded, preferences_json, updated_at,
  avatar_url, bio, location, profile_visibility, share_cooked_meals
) on public.profiles to authenticated;

-- Cron reminder job filters on this; index keeps it cheap.
create index if not exists profiles_trial_ends_idx
  on public.profiles (trial_ends_at)
  where subscription_status = 'trialing';
