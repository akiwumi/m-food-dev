-- Tracks the authoritative Stripe subscription state for each user.
-- The stripe-webhook edge function writes here; the app reads it on load.
create table if not exists public.subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id  text unique,
  stripe_sub_id       text,
  status              text not null default 'none',   -- none | trialing | active | past_due | canceled
  plan                text,                           -- annual | quarterly | monthly
  current_period_end  timestamptz,
  trial_end           timestamptz,
  updated_at          timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can only read their own row; the service role writes via webhooks.
create policy "users read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "service role full access on subscriptions"
  on public.subscriptions for all using (true) with check (true);
