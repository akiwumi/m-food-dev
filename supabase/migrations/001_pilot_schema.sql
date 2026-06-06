create extension if not exists pgcrypto;

create table if not exists public.invites (
  email text primary key,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarded boolean not null default false,
  preferences_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mood_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood_key text not null,
  definition_json jsonb not null default '{}'::jsonb,
  unique(user_id, mood_key)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft',
  rights_json jsonb not null default '{}'::jsonb,
  safety_json jsonb not null default '{}'::jsonb,
  tags_json jsonb not null default '{}'::jsonb,
  nutrition_json jsonb not null default '{}'::jsonb,
  total_time_minutes integer,
  created_at timestamptz not null default now()
);

create table if not exists public.ranking_configs (
  version text primary key,
  config_json jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood_key text,
  energy integer check (energy between 0 and 100),
  context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood_entry_id uuid references public.mood_entries(id) on delete set null,
  ranking_config_version text references public.ranking_configs(version),
  candidates_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id),
  current_step integer not null default 0,
  state_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  rating integer check (rating between 1 and 5),
  outcome_json jsonb not null default '{}'::jsonb,
  nutrition_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.mood_definitions enable row level security;
alter table public.mood_entries enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.cooking_sessions enable row level security;
alter table public.diary_entries enable row level security;

create policy "profiles own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "moods own" on public.mood_definitions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entries own" on public.mood_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "runs own" on public.recommendation_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions own" on public.cooking_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diary own" on public.diary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "published recipes read" on public.recipes for select using (status = 'published');
