-- ============================================================================
-- PDF Password Remover — storage bucket + policies
-- Run AFTER schema.sql, once, in the Supabase SQL editor.
--
-- The bucket is PRIVATE. Nothing is readable with a public URL; the Edge
-- Function mints short-lived signed URLs only for the requesting user's own
-- files. Every object key is "<auth.uid()>/<file>", and the policies below
-- enforce that a user can only ever touch their own folder.
-- ============================================================================

-- ---------- the private bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pr_pdfs', 'pr_pdfs', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- owner-scoped access ----------
-- Uploads: the first folder segment must be the caller's uid.
drop policy if exists pr_pdfs_owner_insert on storage.objects;
create policy pr_pdfs_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pr_pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reads: same scoping. The signed-URL download flow goes through the Edge
-- Function with the service role, so this policy covers direct client reads.
drop policy if exists pr_pdfs_owner_select on storage.objects;
create policy pr_pdfs_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pr_pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists pr_pdfs_owner_update on storage.objects;
create policy pr_pdfs_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pr_pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pr_pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists pr_pdfs_owner_delete on storage.objects;
create policy pr_pdfs_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pr_pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nobody may read this bucket as the anonymous role.
drop policy if exists pr_pdfs_public_read on storage.objects;
