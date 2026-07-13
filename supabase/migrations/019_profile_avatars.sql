-- 019_profile_avatars.sql — profile photos for the social features. Avatars are
-- shared content (they appear in search results and the feed), so they live in a
-- public bucket; each user may only write under their own uid/ prefix. The
-- profiles.avatar_url column already exists (002); the client now uploads the
-- image here and stores its public URL there (see useProfileSync + AccountScreen).

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
