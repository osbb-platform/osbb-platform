-- P09 T2 — migrate the existing single-city contour into Zaporizhzhia.
--
-- Scope:
--   1) create/upsert the canonical city "Запоріжжя";
--   2) assign every existing district to it;
--   3) assign city-scoped memberships to it;
--   4) keep superadmin/global semantics untouched.
--
-- IMPORTANT:
-- - Kyiv is NOT created or launched here.
-- - content_manager enum may not exist yet (T3a comes later), therefore role
--   matching deliberately uses role::text.
-- - districts.city_id remains nullable until the separate T2 verification gate
--   and follow-up NOT NULL migration.
--
-- Preflight (READ ONLY):
--   select role::text,status,count(*),count(*) filter(where city_id is null)
--   from public.admin_memberships group by 1,2 order by 1,2;
--   select count(*),count(*) filter(where city_id is null) from public.districts;
--
-- Verification after apply:
--   select id,name,slug,is_active from public.cities where name='Запоріжжя';
--   select count(*) from public.districts where city_id is null; -- must be 0
--   select count(*) from public.admin_memberships
--     where role::text in ('admin','manager','content_manager')
--       and city_id is null; -- must be 0
--   select count(*) from public.admin_memberships
--     where role::text in ('superadmin','super_admin')
--       and city_id is not null; -- must be 0
--
-- Rollback / forward-fix:
--   Data migration is reversible with a targeted UPDATE only if required before
--   multi-city data is created. Do not drop cities/city_id.

begin;

insert into public.cities (
  name,
  slug,
  is_active
)
values (
  'Запоріжжя',
  'zaporizhzhia',
  true
)
on conflict (name) do update
set
  slug = excluded.slug,
  is_active = excluded.is_active;

with zp as (
  select id
  from public.cities
  where name = 'Запоріжжя'
  limit 1
)
update public.districts as district
set city_id = zp.id
from zp
where district.city_id is null;

with zp as (
  select id
  from public.cities
  where name = 'Запоріжжя'
  limit 1
)
update public.admin_memberships as membership
set city_id = zp.id
from zp
where membership.city_id is null
  and membership.role::text in (
    'admin',
    'manager',
    'content_manager'
  );

do $$
declare
  missing_districts bigint;
  missing_memberships bigint;
  scoped_superadmins bigint;
begin
  select count(*)
  into missing_districts
  from public.districts
  where city_id is null;

  if missing_districts <> 0 then
    raise exception
      'P09 T2 verification failed: % districts remain without city',
      missing_districts;
  end if;

  select count(*)
  into missing_memberships
  from public.admin_memberships
  where role::text in ('admin','manager','content_manager')
    and city_id is null;

  if missing_memberships <> 0 then
    raise exception
      'P09 T2 verification failed: % city-scoped memberships remain without city',
      missing_memberships;
  end if;

  select count(*)
  into scoped_superadmins
  from public.admin_memberships
  where role::text in ('superadmin','super_admin')
    and city_id is not null;

  if scoped_superadmins <> 0 then
    raise exception
      'P09 T2 verification failed: % superadmin memberships unexpectedly have city',
      scoped_superadmins;
  end if;
end
$$;

commit;
