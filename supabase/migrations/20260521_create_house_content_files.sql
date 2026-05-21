create table public.house_content_files (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,
  field_key text not null,

  storage_bucket text not null,
  storage_path text not null,
  original_file_name text null,
  mime_type text null,
  size_bytes bigint null,

  uploaded_at timestamptz not null default now()
);

create index house_content_files_entity_idx
  on public.house_content_files (entity_type, entity_id);

create index house_content_files_field_idx
  on public.house_content_files (entity_type, entity_id, field_key);

alter table public.house_content_files enable row level security;

create policy "Admins manage house_content_files"
  on public.house_content_files
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  );

create policy "Authenticated read house_content_files"
  on public.house_content_files
  for select
  to authenticated
  using (true);
