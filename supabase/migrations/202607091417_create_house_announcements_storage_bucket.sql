-- P02.T1 — private PDF storage bucket for house announcement attachments.
--
-- Scope:
-- - Creates/updates private bucket `house-announcements`.
-- - Allows admin browser uploads/deletes.
-- - Keeps reads private: no storage.objects SELECT policy is created here.
-- - Public/admin access must go through `/api/reports/view` + resolveSignedFileUrl.
-- - `house_announcements` table schema is intentionally unchanged.
--
-- Compatibility note:
-- The same bucket name is already used by the existing generated house-level
-- announcement PDF flow (`{houseId}/announcement.pdf`). This migration preserves
-- that bucket and only enforces privacy, PDF MIME and 15MB limit.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'house-announcements',
  'house-announcements',
  false,
  15728640,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'house_announcements_admin_insert'
  ) then
    create policy house_announcements_admin_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'house-announcements'
        and public.get_my_admin_role() is not null
        and public.get_my_admin_role() <> 'inactive'
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'house_announcements_admin_update'
  ) then
    create policy house_announcements_admin_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'house-announcements'
        and public.get_my_admin_role() is not null
        and public.get_my_admin_role() <> 'inactive'
      )
      with check (
        bucket_id = 'house-announcements'
        and public.get_my_admin_role() is not null
        and public.get_my_admin_role() <> 'inactive'
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'house_announcements_admin_delete'
  ) then
    create policy house_announcements_admin_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'house-announcements'
        and public.get_my_admin_role() is not null
        and public.get_my_admin_role() <> 'inactive'
      );
  end if;
end $$;
