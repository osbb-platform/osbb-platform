-- P02 production hotfix.
--
-- The original storage policies used a global-only role helper.
-- Its current production implementation considers only memberships
-- where house_id is null.
--
-- As a result, an active administrator assigned to a specific house could
-- use the CMS but could not upload an announcement PDF for that house.
--
-- This helper authorizes the exact house encoded in the storage path.
-- Reads remain private: no SELECT policy is created.

create or replace function public.can_manage_house_announcement_storage_object(
  object_name text
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
        -- P02 attachment:
        -- houses/{houseId}/announcements/{announcementId}/{file}.pdf
        when object_name ~* (
          '^houses/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/announcements/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/[^/]+[.]pdf$'
        )
        then split_part(object_name, '/', 2)::uuid

        -- Existing generated house PDF:
        -- {houseId}/announcement.pdf
        when object_name ~* (
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' ||
          '/announcement[.]pdf$'
        )
        then split_part(object_name, '/', 1)::uuid

        else null::uuid
      end as target_house_id
  )
  select exists (
    select 1
    from parsed_path parsed
    join public.admin_memberships membership
      on membership.user_id = auth.uid()
     and membership.is_active = true
     and (
       membership.status is null
       or membership.status = 'active'
     )
     and (
       membership.house_id is null
       or membership.house_id = parsed.target_house_id
     )
    where parsed.target_house_id is not null
  );
$function$;

revoke all
on function public.can_manage_house_announcement_storage_object(text)
from public;

revoke execute
on function public.can_manage_house_announcement_storage_object(text)
from anon;

grant execute
on function public.can_manage_house_announcement_storage_object(text)
to authenticated;

drop policy if exists house_announcements_admin_insert
on storage.objects;

drop policy if exists house_announcements_admin_update
on storage.objects;

drop policy if exists house_announcements_admin_delete
on storage.objects;

create policy house_announcements_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'house-announcements'
  and public.can_manage_house_announcement_storage_object(name)
);

create policy house_announcements_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'house-announcements'
  and public.can_manage_house_announcement_storage_object(name)
)
with check (
  bucket_id = 'house-announcements'
  and public.can_manage_house_announcement_storage_object(name)
);

create policy house_announcements_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'house-announcements'
  and public.can_manage_house_announcement_storage_object(name)
);
