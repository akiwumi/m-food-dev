-- Explicitly lock every privileged/global table. Service-role operations bypass RLS.
alter table public.invites enable row level security;
alter table public.recipes enable row level security;
alter table public.ranking_configs enable row level security;

revoke all on public.invites from anon, authenticated;
revoke insert, update, delete on public.recipes from anon, authenticated;
revoke all on public.ranking_configs from anon, authenticated;
grant select on public.recipes to anon, authenticated;
grant select on public.ranking_configs to authenticated;

create policy "active ranking configs read" on public.ranking_configs for select
  to authenticated using (active = true);

alter table public.profiles
  add constraint profiles_visibility_check check (profile_visibility in ('connections','public','private')),
  add constraint profiles_bio_length check (char_length(coalesce(bio, '')) <= 300),
  add constraint profiles_location_length check (char_length(coalesce(location, '')) <= 100),
  add constraint profiles_avatar_owner_path check (avatar_url is null or avatar_url like id::text || '/%');
alter table public.connections
  add constraint connections_status_check check (status in ('pending','accepted','blocked')),
  add constraint connections_not_self check (requester_id <> addressee_id);
alter table public.community_posts
  add constraint posts_visibility_check check (visibility in ('connections','public','private')),
  add constraint posts_body_length check (char_length(coalesce(body, '')) <= 1000),
  add constraint posts_image_owner_path check (image_path is null or image_path like user_id::text || '/%');
alter table public.post_comments
  add constraint comments_body_length check (char_length(body) between 1 and 500);
alter table public.household_diners
  add constraint diners_name_length check (char_length(name) between 1 and 80);

create index if not exists connections_addressee_status_idx on public.connections(addressee_id, status);
create index if not exists community_posts_user_created_idx on public.community_posts(user_id, created_at desc);
create index if not exists post_comments_post_created_idx on public.post_comments(post_id, created_at);
create index if not exists mood_entries_user_created_idx on public.mood_entries(user_id, created_at desc);
create index if not exists diary_entries_user_created_idx on public.diary_entries(user_id, created_at desc);

create or replace function public.can_view_community_post(target_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_posts p
    where p.id = target_post_id
      and (
        p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'connections'
          and exists (
            select 1 from public.connections c
            where c.status = 'accepted'
              and ((c.requester_id = auth.uid() and c.addressee_id = p.user_id)
                or (c.addressee_id = auth.uid() and c.requester_id = p.user_id))
          )
        )
      )
  );
$$;
revoke all on function public.can_view_community_post(uuid) from public, anon;
grant execute on function public.can_view_community_post(uuid) to authenticated;

drop policy if exists "connections participants" on public.connections;
create policy "connections participants read" on public.connections for select
  to authenticated using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections requester insert" on public.connections for insert
  to authenticated with check (auth.uid() = requester_id and status = 'pending');
create policy "connections addressee update" on public.connections for update
  to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status in ('accepted', 'blocked'));
create policy "connections participants delete" on public.connections for delete
  to authenticated using (auth.uid() = requester_id or auth.uid() = addressee_id);
revoke update on public.connections from authenticated;
grant update(status) on public.connections to authenticated;

drop policy if exists "posts owner write" on public.community_posts;
drop policy if exists "public posts read" on public.community_posts;
create policy "posts visible read" on public.community_posts for select
  to authenticated using (public.can_view_community_post(id));
create policy "posts owner insert" on public.community_posts for insert
  to authenticated with check (auth.uid() = user_id);
create policy "posts owner update" on public.community_posts for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts owner delete" on public.community_posts for delete
  to authenticated using (auth.uid() = user_id);

drop policy if exists "likes own" on public.post_likes;
create policy "likes visible read" on public.post_likes for select
  to authenticated using (public.can_view_community_post(post_id));
create policy "likes own insert" on public.post_likes for insert
  to authenticated with check (auth.uid() = user_id and public.can_view_community_post(post_id));
create policy "likes own delete" on public.post_likes for delete
  to authenticated using (auth.uid() = user_id);

drop policy if exists "comments own write" on public.post_comments;
create policy "comments visible read" on public.post_comments for select
  to authenticated using (public.can_view_community_post(post_id));
create policy "comments own insert" on public.post_comments for insert
  to authenticated with check (auth.uid() = user_id and public.can_view_community_post(post_id));
create policy "comments own update" on public.post_comments for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments own delete" on public.post_comments for delete
  to authenticated using (auth.uid() = user_id);

-- Browser clients must never directly mutate analytics snapshots.
revoke insert, update, delete on public.health_trend_snapshots from anon, authenticated;
revoke insert, update, delete on public.family_health_snapshots from anon, authenticated;
revoke insert, update, delete on public.recommendation_runs from anon, authenticated;
