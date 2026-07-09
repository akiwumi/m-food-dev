-- Food photo binaries move out of profiles.preferences_json / localStorage
-- into private Storage. Client re-encodes to <=1024px JPEG, so 1 MB is ample.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-photos', 'food-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users insert own food photos" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own food photos" on storage.objects for select
  to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own food photos" on storage.objects for delete
  to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);
