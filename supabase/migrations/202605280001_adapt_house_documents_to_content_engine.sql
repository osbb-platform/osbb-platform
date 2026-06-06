-- N5.T7 documents: adapt existing house_documents to content-engine v2.
-- house_documents already exists; this migration keeps legacy storage columns
-- for N6 safety while moving canonical file tracking into house_content_files.

do $$
begin
  if to_regclass('public.house_documents') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'house_documents'
         and column_name = 'visibility_status'
     )
     and not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'house_documents'
         and column_name = 'lifecycle_status'
     )
  then
    alter table public.house_documents
      rename column visibility_status to lifecycle_status;
  end if;
end $$;

alter table if exists public.house_documents
  drop constraint if exists house_documents_visibility_status_check;

alter table if exists public.house_documents
  drop constraint if exists house_documents_lifecycle_status_check;

-- Current CMS used visibility_status='private' as the archive bucket.
update public.house_documents
set lifecycle_status = 'archived'
where lifecycle_status = 'private';

alter table if exists public.house_documents
  add constraint house_documents_lifecycle_status_check
  check (lifecycle_status in ('draft', 'published', 'archived'));

alter table if exists public.house_documents
  add column if not exists lock_version int not null default 1;

alter table if exists public.house_documents
  add column if not exists published_at timestamptz null;

alter table if exists public.house_documents
  add column if not exists archived_at timestamptz null;

update public.house_documents
set published_at = coalesce(published_at, updated_at)
where lifecycle_status = 'published';

update public.house_documents
set archived_at = coalesce(archived_at, updated_at)
where lifecycle_status = 'archived';

create index if not exists house_documents_house_id_lifecycle_status_idx
  on public.house_documents (house_id, lifecycle_status);

create index if not exists house_documents_house_id_scope_lifecycle_idx
  on public.house_documents (house_id, document_scope, lifecycle_status);

insert into public.house_content_files
  (
    entity_type,
    entity_id,
    field_key,
    storage_bucket,
    storage_path,
    original_file_name,
    mime_type,
    size_bytes,
    uploaded_at
  )
select
  'house_document',
  id,
  'pdf',
  storage_bucket,
  storage_path,
  original_file_name,
  mime_type,
  file_size_bytes,
  coalesce(uploaded_at, created_at, now())
from public.house_documents
where storage_path is not null
  and storage_bucket is not null
  and not exists (
    select 1
    from public.house_content_files hcf
    where hcf.entity_type = 'house_document'
      and hcf.entity_id = house_documents.id
      and hcf.field_key = 'pdf'
  );
