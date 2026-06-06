-- Images remain private. The client or a trusted API should issue short-lived
-- signed URLs after checking whether the requester may view the related record.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 4194304, array['image/jpeg', 'image/png', 'image/webp']),
  ('community-images', 'community-images', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users insert own private images" on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'community-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users read own private images" on storage.objects for select
  to authenticated
  using (
    bucket_id in ('avatars', 'community-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own private images" on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'community-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'community-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own private images" on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'community-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
