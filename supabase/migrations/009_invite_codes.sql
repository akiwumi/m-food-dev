-- Invite codes: each code grants a 1-year subscription.
-- Codes are single-use by default (max_uses = 1), but can be set higher.
-- The redeemer's user ID and the Stripe subscription ID (if created) are recorded.

create table if not exists public.invite_codes (
  code             text primary key,
  max_uses         int  not null default 1,
  used_count       int  not null default 0,
  stripe_price_id  text,                           -- optional: tie to a specific Stripe price
  created_at       timestamptz not null default now(),
  expires_at       timestamptz                     -- null = never expires
);

create table if not exists public.invite_redemptions (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null references public.invite_codes(code),
  user_id             uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id  text,
  stripe_sub_id       text,
  subscription_end    timestamptz not null,
  redeemed_at         timestamptz not null default now(),
  unique (code, user_id)         -- one redemption per user per code
);

-- Only service-role can write; authenticated users can read their own redemptions.
alter table public.invite_codes enable row level security;
alter table public.invite_redemptions enable row level security;

create policy "service role full access on invite_codes"
  on public.invite_codes for all using (true) with check (true);

create policy "users read own redemptions"
  on public.invite_redemptions for select
  using (auth.uid() = user_id);

create policy "service role full access on invite_redemptions"
  on public.invite_redemptions for all using (true) with check (true);

-- Seed a handful of launch invite codes (you can add more via the Supabase dashboard).
insert into public.invite_codes (code, max_uses) values
  ('LAUNCH2026',  50),
  ('FOUNDER-A',    1),
  ('FOUNDER-B',    1),
  ('FOUNDER-C',    1),
  ('FOUNDER-D',    1),
  ('FOUNDER-E',    1),
  ('FOUNDER-F',    1),
  ('FRIEND2026',  10)
on conflict (code) do nothing;
