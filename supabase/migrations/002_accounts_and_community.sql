alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists profile_visibility text not null default 'connections',
  add column if not exists share_cooked_meals boolean not null default true;

create table if not exists public.connections (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  body text,
  image_path text,
  visibility text not null default 'connections',
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.connections enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

create policy "connections participants" on public.connections for all
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id);
create policy "posts owner write" on public.community_posts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public posts read" on public.community_posts for select using (visibility = 'public' or auth.uid() = user_id);
create policy "likes own" on public.post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments own write" on public.post_comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
