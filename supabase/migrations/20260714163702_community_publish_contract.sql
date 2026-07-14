-- Keep community publishing usable from browser and Capacitor clients. Table
-- privileges permit the operation while RLS continues to enforce ownership.
alter table public.community_posts
  add column if not exists recipe_ref text,
  add column if not exists recipe_title text;

alter table public.community_posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;

grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, update, delete on public.post_likes to authenticated;

drop policy if exists "posts owner insert" on public.community_posts;
create policy "posts owner insert" on public.community_posts for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "posts owner update" on public.community_posts;
create policy "posts owner update" on public.community_posts for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "posts owner delete" on public.community_posts;
create policy "posts owner delete" on public.community_posts for delete
  to authenticated using (auth.uid() = user_id);

drop policy if exists "comments own insert" on public.post_comments;
create policy "comments own insert" on public.post_comments for insert
  to authenticated with check (
    auth.uid() = user_id and public.can_view_community_post(post_id)
  );

drop policy if exists "likes own insert" on public.post_likes;
create policy "likes own insert" on public.post_likes for insert
  to authenticated with check (
    auth.uid() = user_id and public.can_view_community_post(post_id)
  );

insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "post images public read" on storage.objects;
create policy "post images public read" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "post images owner write" on storage.objects;
create policy "post images owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
