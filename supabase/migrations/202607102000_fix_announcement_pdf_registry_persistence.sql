begin;

-- Final, idempotent announcement PDF persistence migration.
-- No temporary tables are used.

create or replace function public.can_manage_house_announcement_content_file(
  target_entity_id uuid,
  target_field_key text,
  target_storage_bucket text,
  target_storage_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  with parsed_path as (
    select
      case
        when target_storage_path ~* (
          '^houses/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/announcements/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/[^/]+[.]pdf$'
        )
        then split_part(target_storage_path, '/', 2)::uuid
        else null::uuid
      end as path_house_id,
      case
        when target_storage_path ~* (
          '^houses/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/announcements/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/[^/]+[.]pdf$'
        )
        then split_part(target_storage_path, '/', 4)::uuid
        else null::uuid
      end as path_announcement_id
  )
  select exists (
    select 1
    from parsed_path parsed
    join public.house_announcements announcement
      on announcement.id = target_entity_id
     and announcement.id = parsed.path_announcement_id
     and announcement.house_id = parsed.path_house_id
    join public.admin_memberships membership
      on membership.user_id = auth.uid()
     and membership.is_active = true
     and (
       membership.status is null
       or membership.status = 'active'
     )
     and (
       membership.house_id is null
       or membership.house_id = announcement.house_id
     )
    where target_field_key = 'pdf'
      and target_storage_bucket = 'house-announcements'
  );
$function$;

revoke all
on function public.can_manage_house_announcement_content_file(
  uuid,
  text,
  text,
  text
)
from public;

revoke execute
on function public.can_manage_house_announcement_content_file(
  uuid,
  text,
  text,
  text
)
from anon;

grant execute
on function public.can_manage_house_announcement_content_file(
  uuid,
  text,
  text,
  text
)
to authenticated;

grant execute
on function public.can_manage_house_announcement_content_file(
  uuid,
  text,
  text,
  text
)
to service_role;

drop policy if exists house_announcement_files_admin_insert
on public.house_content_files;

drop policy if exists house_announcement_files_admin_update
on public.house_content_files;

drop policy if exists house_announcement_files_admin_delete
on public.house_content_files;

create policy house_announcement_files_admin_insert
on public.house_content_files
for insert
to authenticated
with check (
  entity_type = 'house_announcement'
  and public.can_manage_house_announcement_content_file(
    entity_id,
    field_key,
    storage_bucket,
    storage_path
  )
);

create policy house_announcement_files_admin_update
on public.house_content_files
for update
to authenticated
using (
  entity_type = 'house_announcement'
  and public.can_manage_house_announcement_content_file(
    entity_id,
    field_key,
    storage_bucket,
    storage_path
  )
)
with check (
  entity_type = 'house_announcement'
  and public.can_manage_house_announcement_content_file(
    entity_id,
    field_key,
    storage_bucket,
    storage_path
  )
);

create policy house_announcement_files_admin_delete
on public.house_content_files
for delete
to authenticated
using (
  entity_type = 'house_announcement'
  and public.can_manage_house_announcement_content_file(
    entity_id,
    field_key,
    storage_bucket,
    storage_path
  )
);

drop policy if exists "Public read published house announcement files"
on public.house_content_files;

create policy "Public read published house announcement files"
on public.house_content_files
for select
to anon
using (
  entity_type = 'house_announcement'
  and field_key = 'pdf'
  and storage_bucket = 'house-announcements'
  and exists (
    select 1
    from public.house_announcements announcement
    join public.houses house
      on house.id = announcement.house_id
    where announcement.id = house_content_files.entity_id
      and announcement.lifecycle_status = 'published'
      and house.is_active = true
      and house.archived_at is null
      and house_content_files.storage_path ~* (
        '^houses/' ||
        announcement.house_id::text ||
        '/announcements/' ||
        announcement.id::text ||
        '/[^/]+[.]pdf$'
      )
  )
);

do $duplicate_check$
begin
  if exists (
    select 1
    from public.house_content_files
    where entity_type = 'house_announcement'
      and field_key = 'pdf'
    group by entity_id
    having count(*) > 1
  ) then
    raise exception
      'Duplicate announcement PDF registry rows exist';
  end if;
end;
$duplicate_check$;

create unique index if not exists
  house_content_files_one_announcement_pdf_idx
on public.house_content_files (entity_id)
where entity_type = 'house_announcement'
  and field_key = 'pdf';

with ranked as (
  select
    object.name as storage_path,
    object.created_at,
    object.metadata,
    split_part(object.name, '/', 2)::uuid as house_id,
    split_part(object.name, '/', 4)::uuid as announcement_id,
    row_number() over (
      partition by split_part(object.name, '/', 4)::uuid
      order by object.created_at desc, object.name desc
    ) as candidate_rank
  from storage.objects object
  where object.bucket_id = 'house-announcements'
    and object.name ~* (
      '^houses/' ||
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
      '/announcements/' ||
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
      '/[^/]+[.]pdf$'
    )
),
latest as (
  select
    candidate.storage_path,
    candidate.created_at,
    candidate.metadata,
    candidate.house_id,
    candidate.announcement_id
  from ranked candidate
  join public.house_announcements announcement
    on announcement.id = candidate.announcement_id
   and announcement.house_id = candidate.house_id
  where candidate.candidate_rank = 1
),
updated as (
  update public.house_content_files registry
  set
    storage_bucket = 'house-announcements',
    storage_path = latest.storage_path,
    original_file_name = regexp_replace(latest.storage_path, '^.*/', ''),
    mime_type = 'application/pdf',
    size_bytes = case
      when coalesce(latest.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (latest.metadata ->> 'size')::bigint
      when coalesce(latest.metadata ->> 'contentLength', '') ~ '^[0-9]+$'
        then (latest.metadata ->> 'contentLength')::bigint
      else null
    end,
    uploaded_at = latest.created_at
  from latest
  where registry.entity_type = 'house_announcement'
    and registry.entity_id = latest.announcement_id
    and registry.field_key = 'pdf'
    and (
      registry.storage_bucket is distinct from 'house-announcements'
      or registry.storage_path is distinct from latest.storage_path
      or registry.original_file_name is distinct from
        regexp_replace(latest.storage_path, '^.*/', '')
    )
  returning registry.entity_id
),
inserted as (
  insert into public.house_content_files (
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
    'house_announcement',
    latest.announcement_id,
    'pdf',
    'house-announcements',
    latest.storage_path,
    regexp_replace(latest.storage_path, '^.*/', ''),
    'application/pdf',
    case
      when coalesce(latest.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (latest.metadata ->> 'size')::bigint
      when coalesce(latest.metadata ->> 'contentLength', '') ~ '^[0-9]+$'
        then (latest.metadata ->> 'contentLength')::bigint
      else null
    end,
    latest.created_at
  from latest
  where not exists (
    select 1
    from public.house_content_files registry
    where registry.entity_type = 'house_announcement'
      and registry.entity_id = latest.announcement_id
      and registry.field_key = 'pdf'
  )
  returning entity_id
),
verification as (
  select
    (select count(*) from latest) as live_announcements_with_pdf_objects,
    (select count(*) from updated) as updated_registry_rows,
    (select count(*) from inserted) as inserted_registry_rows,
    (
      select count(*)
      from latest
      left join public.house_content_files registry
        on registry.entity_type = 'house_announcement'
       and registry.entity_id = latest.announcement_id
       and registry.field_key = 'pdf'
       and registry.storage_bucket = 'house-announcements'
       and registry.storage_path = latest.storage_path
      where registry.id is null
    ) as canonical_mismatches,
    (
      select count(*)
      from storage.objects object
      where object.bucket_id = 'house-announcements'
        and object.name ~* (
          '^houses/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/announcements/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/[^/]+[.]pdf$'
        )
        and not exists (
          select 1
          from public.house_announcements announcement
          where announcement.id = split_part(object.name, '/', 4)::uuid
            and announcement.house_id = split_part(object.name, '/', 2)::uuid
        )
    ) as ignored_objects_without_live_announcement
)
select jsonb_pretty(
  jsonb_build_object(
    'status', case
      when verification.canonical_mismatches = 0
        then 'OSBB_ANNOUNCEMENT_PDF_PROD_MIGRATION_APPLIED'
      else 'OSBB_ANNOUNCEMENT_PDF_PROD_MIGRATION_FAILED'
    end,
    'live_announcements_with_pdf_objects',
      verification.live_announcements_with_pdf_objects,
    'updated_registry_rows',
      verification.updated_registry_rows,
    'inserted_registry_rows',
      verification.inserted_registry_rows,
    'canonical_mismatches',
      verification.canonical_mismatches,
    'ignored_objects_without_live_announcement',
      verification.ignored_objects_without_live_announcement,
    'public_policy_exists', exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'house_content_files'
        and policyname = 'Public read published house announcement files'
        and cmd = 'SELECT'
    ),
    'unique_index_valid', exists (
      select 1
      from pg_index
      where indexrelid =
        'public.house_content_files_one_announcement_pdf_idx'::regclass
        and indisvalid
    ),
    'anon_helper_execute', has_function_privilege(
      'anon',
      'public.can_manage_house_announcement_content_file(uuid,text,text,text)',
      'EXECUTE'
    ),
    'authenticated_helper_execute', has_function_privilege(
      'authenticated',
      'public.can_manage_house_announcement_content_file(uuid,text,text,text)',
      'EXECUTE'
    ),
    'completed_at', now()
  )
) as osbb_announcement_pdf_prod_migration
from verification;


do $final_verification$
declare
  canonical_mismatch_count integer;
  duplicate_count integer;
  public_policy_exists boolean;
  unique_index_valid boolean;
  anon_helper_execute boolean;
  authenticated_helper_execute boolean;
begin
  with ranked as (
    select
      object.name as storage_path,
      split_part(object.name, '/', 2)::uuid as house_id,
      split_part(object.name, '/', 4)::uuid as announcement_id,
      row_number() over (
        partition by split_part(object.name, '/', 4)::uuid
        order by object.created_at desc, object.name desc
      ) as candidate_rank
    from storage.objects object
    where object.bucket_id = 'house-announcements'
      and object.name ~* (
        '^houses/' ||
        '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
        '/announcements/' ||
        '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
        '/[^/]+[.]pdf$'
      )
  ),
  latest as (
    select
      candidate.storage_path,
      candidate.announcement_id
    from ranked candidate
    join public.house_announcements announcement
      on announcement.id = candidate.announcement_id
     and announcement.house_id = candidate.house_id
    where candidate.candidate_rank = 1
  )
  select count(*)
  into canonical_mismatch_count
  from latest
  left join public.house_content_files registry
    on registry.entity_type = 'house_announcement'
   and registry.entity_id = latest.announcement_id
   and registry.field_key = 'pdf'
   and registry.storage_bucket = 'house-announcements'
   and registry.storage_path = latest.storage_path
  where registry.id is null;

  select count(*)
  into duplicate_count
  from (
    select entity_id
    from public.house_content_files
    where entity_type = 'house_announcement'
      and field_key = 'pdf'
    group by entity_id
    having count(*) > 1
  ) duplicates;

  select exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'house_content_files'
      and policyname = 'Public read published house announcement files'
      and cmd = 'SELECT'
  )
  into public_policy_exists;

  select exists (
    select 1
    from pg_index
    where indexrelid =
      'public.house_content_files_one_announcement_pdf_idx'::regclass
      and indisvalid
  )
  into unique_index_valid;

  select has_function_privilege(
    'anon',
    'public.can_manage_house_announcement_content_file(uuid,text,text,text)',
    'EXECUTE'
  )
  into anon_helper_execute;

  select has_function_privilege(
    'authenticated',
    'public.can_manage_house_announcement_content_file(uuid,text,text,text)',
    'EXECUTE'
  )
  into authenticated_helper_execute;

  if canonical_mismatch_count <> 0 then
    raise exception
      'Announcement PDF canonical mismatches remain: %',
      canonical_mismatch_count;
  end if;

  if duplicate_count <> 0 then
    raise exception
      'Duplicate announcement PDF registry rows remain: %',
      duplicate_count;
  end if;

  if not public_policy_exists then
    raise exception 'Public announcement PDF policy is missing';
  end if;

  if not unique_index_valid then
    raise exception 'Announcement PDF unique index is missing or invalid';
  end if;

  if anon_helper_execute then
    raise exception 'Anonymous role can execute announcement PDF management helper';
  end if;

  if not authenticated_helper_execute then
    raise exception 'Authenticated role cannot execute announcement PDF management helper';
  end if;
end;
$final_verification$;

commit;
