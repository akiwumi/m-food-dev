-- 018_community_social.sql — activate the social graph for a real, multi-user
-- food community: Facebook-style name search, friend requests, a friends-visible
-- feed, and post images. The tables already exist (002); direct RLS on a social
-- graph is famously fiddly (you must read other people's rows conditionally), so
-- the graph logic lives in SECURITY DEFINER RPCs that filter on auth.uid()
-- internally. Writes (own posts/likes/comments) stay plain RLS inserts.

-- ── Shared-recipe reference ─────────────────────────────────────────────────
-- community_posts.recipe_id is a uuid FK to public.recipes, but the app's
-- catalog recipes (Spoonacular / bundled) use string ids that aren't in that
-- table. Store the catalog id + title as text so any shared recipe re-links in
-- the client (and shows its title even if it isn't in the viewer's catalog).
alter table public.community_posts
  add column if not exists recipe_ref text,
  add column if not exists recipe_title text;

-- ── Friendship helper ───────────────────────────────────────────────────────
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = a and c.addressee_id = b)
        or (c.requester_id = b and c.addressee_id = a))
  );
$$;

-- ── People search (name, Facebook-style) ────────────────────────────────────
-- Returns non-private profiles whose display_name matches, tagged with the
-- viewer's current relationship so the UI can show Add / Requested / Respond.
create or replace function public.search_users(q text)
returns table (id uuid, display_name text, avatar_url text, relationship text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url,
    case
      when p.id = auth.uid() then 'self'
      when public.are_friends(auth.uid(), p.id) then 'friends'
      when exists (select 1 from public.connections c
        where c.requester_id = auth.uid() and c.addressee_id = p.id and c.status = 'pending') then 'pending_out'
      when exists (select 1 from public.connections c
        where c.requester_id = p.id and c.addressee_id = auth.uid() and c.status = 'pending') then 'pending_in'
      else 'none'
    end as relationship
  from public.profiles p
  where p.id <> auth.uid()
    and coalesce(p.profile_visibility, 'connections') <> 'private'
    and coalesce(p.display_name, '') <> ''
    and p.display_name ilike '%' || q || '%'
  order by (p.display_name ilike q || '%') desc, p.display_name
  limit 20;
$$;

-- ── Friend requests: send / respond / remove ────────────────────────────────
create or replace function public.send_friend_request(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target = auth.uid() then raise exception 'cannot friend yourself'; end if;
  -- If they already asked me, sending back accepts instead of duplicating.
  if exists (select 1 from public.connections
    where requester_id = target and addressee_id = auth.uid()) then
    update public.connections set status = 'accepted'
      where requester_id = target and addressee_id = auth.uid();
    return;
  end if;
  insert into public.connections (requester_id, addressee_id, status)
    values (auth.uid(), target, 'pending')
    on conflict (requester_id, addressee_id) do nothing;
end;
$$;

create or replace function public.respond_friend_request(requester uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if accept then
    update public.connections set status = 'accepted'
      where requester_id = requester and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.connections
      where requester_id = requester and addressee_id = auth.uid();
  end if;
end;
$$;

create or replace function public.remove_friend(other uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.connections
    where (requester_id = auth.uid() and addressee_id = other)
       or (requester_id = other and addressee_id = auth.uid());
end;
$$;

-- ── Friends + pending request lists ─────────────────────────────────────────
create or replace function public.list_friends()
returns table (id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url
  from public.connections c
  join public.profiles p
    on p.id = case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end
  where c.status = 'accepted'
    and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
  order by p.display_name;
$$;

create or replace function public.list_friend_requests()
returns table (id uuid, display_name text, avatar_url text, direction text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url,
    case when c.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction
  from public.connections c
  join public.profiles p
    on p.id = case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end
  where c.status = 'pending'
    and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
  order by c.created_at desc;
$$;

-- ── The feed: my posts + accepted friends' posts + public posts ─────────────
create or replace function public.community_feed(limit_n int default 50)
returns table (
  id uuid, author_id uuid, author_name text, author_avatar text,
  body text, image_path text, recipe_ref text, recipe_title text, visibility text, created_at timestamptz,
  like_count bigint, liked_by_me boolean, comment_count bigint
)
language sql stable security definer set search_path = public as $$
  select cp.id, cp.user_id, p.display_name, p.avatar_url,
    cp.body, cp.image_path, cp.recipe_ref, cp.recipe_title, cp.visibility, cp.created_at,
    (select count(*) from public.post_likes l where l.post_id = cp.id),
    exists (select 1 from public.post_likes l where l.post_id = cp.id and l.user_id = auth.uid()),
    (select count(*) from public.post_comments cm where cm.post_id = cp.id)
  from public.community_posts cp
  join public.profiles p on p.id = cp.user_id
  where cp.user_id = auth.uid()
     or cp.visibility = 'public'
     or (cp.visibility = 'connections' and public.are_friends(auth.uid(), cp.user_id))
  order by cp.created_at desc
  limit greatest(1, least(limit_n, 100));
$$;

-- ── Comments for a post the viewer is allowed to see ────────────────────────
create or replace function public.post_comments_list(p_post_id uuid)
returns table (id uuid, author_id uuid, author_name text, author_avatar text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select cm.id, cm.user_id, pr.display_name, pr.avatar_url, cm.body, cm.created_at
  from public.post_comments cm
  join public.profiles pr on pr.id = cm.user_id
  join public.community_posts cp on cp.id = cm.post_id
  where cm.post_id = p_post_id
    and (cp.user_id = auth.uid() or cp.visibility = 'public'
      or (cp.visibility = 'connections' and public.are_friends(auth.uid(), cp.user_id)))
  order by cm.created_at;
$$;

-- ── Grants: only signed-in users may call the social RPCs ────────────────────
grant execute on function public.search_users(text) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
grant execute on function public.community_feed(int) to authenticated;
grant execute on function public.post_comments_list(uuid) to authenticated;

-- ── Post images: a public bucket (shared content), owner-write ──────────────
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

drop policy if exists "post images public read" on storage.objects;
create policy "post images public read" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "post images owner write" on storage.objects;
create policy "post images owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
