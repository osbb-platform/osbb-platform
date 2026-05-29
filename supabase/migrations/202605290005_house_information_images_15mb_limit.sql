-- Hotfix: allow information post cover images up to 15 MB and support direct browser uploads.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'house-information-images',
  'house-information-images',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

drop policy if exists "Public can read house information images" on storage.objects;
create policy "Public can read house information images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'house-information-images');

drop policy if exists "Authenticated users can upload house information images" on storage.objects;
create policy "Authenticated users can upload house information images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'house-information-images');

drop policy if exists "Authenticated users can update house information images" on storage.objects;
create policy "Authenticated users can update house information images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'house-information-images')
  with check (bucket_id = 'house-information-images');

drop policy if exists "Authenticated users can delete house information images" on storage.objects;
create policy "Authenticated users can delete house information images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'house-information-images');
