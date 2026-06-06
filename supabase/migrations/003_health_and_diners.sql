create table if not exists public.household_diners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,
  preferences_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.health_trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  range_start date not null,
  range_end date not null,
  source_labels_json jsonb not null default '[]'::jsonb,
  trends_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.family_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  range_start date not null,
  range_end date not null,
  aggregate_trends_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.household_diners enable row level security;
alter table public.health_trend_snapshots enable row level security;
alter table public.family_health_snapshots enable row level security;
create policy "diners own" on public.household_diners for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "health own" on public.health_trend_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "family health owner" on public.family_health_snapshots for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
