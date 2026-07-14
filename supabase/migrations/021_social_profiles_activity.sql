-- 021_social_profiles_activity.sql — the second wave of social features:
--   • friend suggestions from shared food profile,
--   • recommend-a-friend,
--   • viewing a friend's food profile + cooked/reviewed meals + favourites.
--
-- Privacy: only a CLIENT-CURATED food profile is ever exposed (profiles.
-- food_profile_public), never the psychological profile or raw mood entries.
-- Cross-member reads go through SECURITY DEFINER RPCs gated on can_view_member
-- (self, accepted friend, or a public profile). All RPCs are authenticated-only
-- (Postgres grants EXECUTE to PUBLIC by default — see 020).

-- ── Client-curated public food profile ──────────────────────────────────────
alter table public.profiles
  add column if not exists food_profile_public jsonb not null default '{}'::jsonb;

-- ── A member's cooked/reviewed meals (synced from the local diary) ───────────
create table if not exists public.cooked_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_ref text,
  recipe_title text not null,
  recipe_image text,
  cuisine text,
  rating int,
  cooked_label text,
  created_at timestamptz not null default now()
);
create index if not exists cooked_meals_user_idx on public.cooked_meals(user_id);

-- ── A member's favourite (saved) recipes ────────────────────────────────────
create table if not exists public.saved_recipes (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_ref text not null,
  recipe_title text not null,
  recipe_image text,
  cuisine text,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_ref)
);

-- ── Recommend-a-friend: I suggest person X to my friend Y ───────────────────
create table if not exists public.friend_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommender_id uuid not null references auth.users(id) on delete cascade,
  recommended_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (recommender_id, recommended_id, target_id)
);

alter table public.cooked_meals enable row level security;
alter table public.saved_recipes enable row level security;
alter table public.friend_recommendations enable row level security;

-- Owners manage their own activity rows; cross-member reads are via RPC only.
create policy "cooked own" on public.cooked_meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved own" on public.saved_recipes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- The recommender writes; the target reads their own recommendations (via RPC).
create policy "recs write" on public.friend_recommendations for all
  using (auth.uid() = recommender_id) with check (auth.uid() = recommender_id);

-- ── Visibility helper ───────────────────────────────────────────────────────
create or replace function public.can_view_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target = auth.uid()
    or public.are_friends(auth.uid(), target)
    or exists (select 1 from public.profiles p
      where p.id = target and coalesce(p.profile_visibility, 'connections') = 'public');
$$;

-- ── Friend suggestions from shared food profile ─────────────────────────────
create or replace function public.suggest_friends()
returns table (id uuid, display_name text, avatar_url text, shared_cuisines int)
language sql stable security definer set search_path = public as $$
  with me as (
    select coalesce(food_profile_public->'cuisines', '[]'::jsonb) as cuisines,
           food_profile_public->>'diet' as diet
    from public.profiles where id = auth.uid()
  )
  select p.id, p.display_name, p.avatar_url,
    (select count(*)::int from jsonb_array_elements_text(coalesce(p.food_profile_public->'cuisines', '[]'::jsonb)) c
      where c in (select jsonb_array_elements_text((select cuisines from me)))) as shared_cuisines
  from public.profiles p, me
  where p.id <> auth.uid()
    and coalesce(p.profile_visibility, 'connections') <> 'private'
    and coalesce(p.display_name, '') <> ''
    and not public.are_friends(auth.uid(), p.id)
    and not exists (select 1 from public.connections c
      where (c.requester_id = auth.uid() and c.addressee_id = p.id)
         or (c.requester_id = p.id and c.addressee_id = auth.uid()))
    and (
      (select count(*) from jsonb_array_elements_text(coalesce(p.food_profile_public->'cuisines', '[]'::jsonb)) c
        where c in (select jsonb_array_elements_text((select cuisines from me)))) > 0
      or (nullif(me.diet, '') is not null and p.food_profile_public->>'diet' = me.diet)
    )
  order by shared_cuisines desc, p.display_name
  limit 20;
$$;

-- ── A member's profile (food profile + counts), if viewable ─────────────────
create or replace function public.member_profile(target uuid)
returns table (id uuid, display_name text, avatar_url text, bio text, location text,
  visibility text, is_friend boolean, food_profile jsonb, cooked_count bigint, favorite_count bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.bio, p.location,
    coalesce(p.profile_visibility, 'connections'),
    public.are_friends(auth.uid(), p.id),
    p.food_profile_public,
    (select count(*) from public.cooked_meals m where m.user_id = p.id),
    (select count(*) from public.saved_recipes s where s.user_id = p.id)
  from public.profiles p
  where p.id = target and public.can_view_member(target);
$$;

create or replace function public.member_cooked(target uuid)
returns table (recipe_ref text, recipe_title text, recipe_image text, cuisine text, rating int, cooked_label text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.recipe_ref, m.recipe_title, m.recipe_image, m.cuisine, m.rating, m.cooked_label, m.created_at
  from public.cooked_meals m
  where m.user_id = target and public.can_view_member(target)
  order by m.created_at desc limit 100;
$$;

create or replace function public.member_favorites(target uuid)
returns table (recipe_ref text, recipe_title text, recipe_image text, cuisine text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.recipe_ref, s.recipe_title, s.recipe_image, s.cuisine, s.created_at
  from public.saved_recipes s
  where s.user_id = target and public.can_view_member(target)
  order by s.created_at desc limit 100;
$$;

-- ── Recommend-a-friend RPCs ─────────────────────────────────────────────────
create or replace function public.recommend_friend(recommended uuid, target uuid, note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if recommended = auth.uid() or target = auth.uid() or recommended = target then
    raise exception 'invalid recommendation';
  end if;
  if not public.are_friends(auth.uid(), target) then
    raise exception 'can only recommend to a friend';
  end if;
  insert into public.friend_recommendations (recommender_id, recommended_id, target_id, note)
    values (auth.uid(), recommended, target, left(coalesce(note, ''), 300))
    on conflict (recommender_id, recommended_id, target_id) do nothing;
end;
$$;

create or replace function public.list_recommendations()
returns table (recommended_id uuid, recommended_name text, recommended_avatar text,
  recommender_name text, note text, relationship text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select fr.recommended_id, rp.display_name, rp.avatar_url, rr.display_name, fr.note,
    case
      when public.are_friends(auth.uid(), fr.recommended_id) then 'friends'
      when exists (select 1 from public.connections c
        where c.requester_id = auth.uid() and c.addressee_id = fr.recommended_id and c.status = 'pending') then 'pending_out'
      when exists (select 1 from public.connections c
        where c.requester_id = fr.recommended_id and c.addressee_id = auth.uid() and c.status = 'pending') then 'pending_in'
      else 'none'
    end,
    max(fr.created_at)
  from public.friend_recommendations fr
  join public.profiles rp on rp.id = fr.recommended_id
  join public.profiles rr on rr.id = fr.recommender_id
  where fr.target_id = auth.uid()
    and fr.recommended_id <> auth.uid()
    and not public.are_friends(auth.uid(), fr.recommended_id)
  group by fr.recommended_id, rp.display_name, rp.avatar_url, rr.display_name, fr.note
  order by max(fr.created_at) desc;
$$;

-- ── Grants: authenticated only (never anon) ─────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'can_view_member(uuid)', 'suggest_friends()', 'member_profile(uuid)',
    'member_cooked(uuid)', 'member_favorites(uuid)',
    'recommend_friend(uuid, uuid, text)', 'list_recommendations()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
