drop policy if exists "Public read house document content files" on public.house_content_files;
create policy "Public read house document content files"
on public.house_content_files
for select
to anon
using (
  entity_type = 'house_document'
  and field_key = 'pdf'
);

drop policy if exists "Public read house report content files" on public.house_content_files;
create policy "Public read house report content files"
on public.house_content_files
for select
to anon
using (
  entity_type = 'house_report'
  and field_key = 'pdf'
);

drop policy if exists "Public read house information post files" on public.house_content_files;
create policy "Public read house information post files"
on public.house_content_files
for select
to anon
using (
  entity_type = 'house_information_post'
  and field_key = 'coverImage'
);
