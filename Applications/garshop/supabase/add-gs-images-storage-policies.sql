-- GarShop: allow uploads to the public gs_images bucket.
-- All app uploads use "<auth.uid()>/<file>" as the object key, so each
-- authenticated user can only write to their own folder.

create policy "gs_images_auth_write" on storage.objects
  for insert to public
  with check (
    bucket_id = 'gs_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "gs_images_auth_update" on storage.objects
  for update to public
  using (
    bucket_id = 'gs_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "gs_images_auth_delete" on storage.objects
  for delete to public
  using (
    bucket_id = 'gs_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "gs_images_public_read" on storage.objects
  for select to public
  using (bucket_id = 'gs_images');
