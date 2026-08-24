-- P09 R0.1 — city-scope substrate + houses/districts RLS canary.
--
-- Why the minimal city schema is introduced in R0.1:
-- P09 requires city-aware RLS to be completed before city product work, while
-- the original T1 placed cities/city_id after R0. City-aware predicates cannot
-- exist without the referenced columns. Therefore R0.1 pulls forward only the
-- additive schema substrate needed for tenant isolation:
--   cities
--   districts.city_id (nullable until T2 backfill)
--   admin_memberships.city_id (nullable until T2 backfill)
-- No city is seeded here, no Kyiv launch occurs, and no UI/product behaviour is
-- enabled. T2 remains responsible for the Zaporizhzhia backfill and NOT NULL.
--
-- Preflight (production, READ ONLY):
--   select role::text, status, count(*)
--   from public.admin_memberships group by 1,2 order by 1,2;
--
--   select count(*) filter (where district_id is null) as no_district,
--          count(*) as houses
--   from public.houses;
--
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname='public' and tablename in ('houses','districts')
--   order by tablename, policyname;
--
-- Verification after apply:
--   select to_regclass('public.cities');
--   select count(*) from public.districts where city_id is not null; -- 0 before T2
--   select count(*) from public.admin_memberships where city_id is not null; -- 0 before T2
--
-- Rollback / forward-fix:
-- Do NOT drop additive columns/table in production. A forward-fix may restore
-- the previous houses/districts policies while keeping the nullable substrate.
-- Enum values are not changed in R0.1.

begin;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.districts
  add column if not exists city_id uuid null;

alter table public.admin_memberships
  add column if not exists city_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'districts_city_id_fkey'
      and conrelid = 'public.districts'::regclass
  ) then
    alter table public.districts
      add constraint districts_city_id_fkey
      foreign key (city_id)
      references public.cities(id)
      on delete restrict;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_memberships_city_id_fkey'
      and conrelid = 'public.admin_memberships'::regclass
  ) then
    alter table public.admin_memberships
      add constraint admin_memberships_city_id_fkey
      foreign key (city_id)
      references public.cities(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists districts_city_id_idx
  on public.districts(city_id);

create index if not exists admin_memberships_city_id_idx
  on public.admin_memberships(city_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'cities_set_updated_at'
      and tgrelid = 'public.cities'::regclass
      and not tgisinternal
  ) then
    create trigger cities_set_updated_at
      before update on public.cities
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

alter table public.cities enable row level security;

create or replace function public.admin_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.admin_memberships as membership
    where membership.user_id = auth.uid()
      and membership.house_id is null
      and membership.is_active = true
      and membership.status = 'active'
      and membership.role::text in ('superadmin', 'super_admin')
  );
$function$;

create or replace function public.admin_current_membership_city()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select membership.city_id
  from public.admin_memberships as membership
  where membership.user_id = auth.uid()
    and membership.house_id is null
    and membership.city_id is not null
    and membership.is_active = true
    and membership.status = 'active'
    and membership.role::text in (
      'admin',
      'manager',
      'content_manager'
    )
  order by membership.created_at asc, membership.id asc
  limit 1;
$function$;

create or replace function public.admin_city_scope(
  target_city uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    public.admin_is_superadmin()
    or (
      target_city is not null
      and exists (
        select 1
        from public.admin_memberships as membership
        where membership.user_id = auth.uid()
          and membership.house_id is null
          and membership.city_id = target_city
          and membership.is_active = true
          and membership.status = 'active'
          and membership.role::text in (
            'admin',
            'manager',
            'content_manager'
          )
      )
    )
    or (
      -- Transitional single-city compatibility only between R0.1 and T2.
      -- It automatically stops matching once any district has a city_id.
      target_city is null
      and not exists (
        select 1
        from public.districts as scoped_district
        where scoped_district.city_id is not null
      )
      and exists (
        select 1
        from public.admin_memberships as membership
        where membership.user_id = auth.uid()
          and membership.house_id is null
          and membership.city_id is null
          and membership.is_active = true
          and membership.status = 'active'
          and membership.role::text in (
            'superadmin',
            'super_admin',
            'admin',
            'manager'
          )
      )
    );
$function$;

create or replace function public.admin_has_district_access(
  target_district_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    target_district_id is not null
    and exists (
      select 1
      from public.districts as district
      where district.id = target_district_id
        and (
          public.admin_city_scope(district.city_id)
          or exists (
            select 1
            from public.admin_memberships as membership
            join public.houses as assigned_house
              on assigned_house.id = membership.house_id
            where membership.user_id = auth.uid()
              and membership.is_active = true
              and membership.status = 'active'
              and membership.role::text in (
                'superadmin',
                'super_admin',
                'admin',
                'manager',
                'content_manager'
              )
              and assigned_house.district_id = district.id
          )
        )
    );
$function$;

create or replace function public.admin_has_house_access(
  target_house_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    target_house_id is not null
    and exists (
      select 1
      from public.houses as house
      left join public.districts as district
        on district.id = house.district_id
      where house.id = target_house_id
        and (
          public.admin_city_scope(district.city_id)
          or exists (
            select 1
            from public.admin_memberships as membership
            where membership.user_id = auth.uid()
              and membership.house_id = target_house_id
              and membership.is_active = true
              and membership.status = 'active'
              and membership.role::text in (
                'superadmin',
                'super_admin',
                'admin',
                'manager',
                'content_manager'
              )
          )
        )
    );
$function$;

comment on function public.admin_is_superadmin() is
  'P09 R0.1: true for an active global superadmin membership, including the legacy super_admin literal.';

comment on function public.admin_current_membership_city() is
  'P09 R0.1: active single-city membership resolver for non-superadmin admin roles.';

comment on function public.admin_city_scope(uuid) is
  'P09 R0.1: city-aware admin scope. Includes a temporary null-city compatibility branch until T2 backfills districts.';

comment on function public.admin_has_district_access(uuid) is
  'P09 R0.1: district scope through city membership or an explicit house assignment in that district.';

comment on function public.admin_has_house_access(uuid) is
  'P09 R0.1: house scope through district city membership or an explicit exact-house assignment.';

revoke all on function public.admin_is_superadmin()
  from public, anon, authenticated;
revoke all on function public.admin_current_membership_city()
  from public, anon, authenticated;
revoke all on function public.admin_city_scope(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_has_district_access(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_has_house_access(uuid)
  from public, anon, authenticated;

grant execute on function public.admin_is_superadmin()
  to authenticated;
grant execute on function public.admin_current_membership_city()
  to authenticated;
grant execute on function public.admin_city_scope(uuid)
  to authenticated;
grant execute on function public.admin_has_district_access(uuid)
  to authenticated;
grant execute on function public.admin_has_house_access(uuid)
  to authenticated;

-- Explicit table privileges ensure authenticated requests reach RLS consistently.
grant select on table public.houses to anon, authenticated;
grant insert, update, delete on table public.houses to authenticated;

grant select on table public.districts to anon, authenticated;
grant insert, update, delete on table public.districts to authenticated;

grant select on table public.cities to authenticated;
grant insert, update, delete on table public.cities to authenticated;

-- Old permissive policies must be removed, not merely supplemented, because
-- permissive PostgreSQL policies combine with OR.
drop policy if exists "Authenticated admins can delete archived houses"
  on public.houses;
drop policy if exists "Authenticated admins can insert houses"
  on public.houses;
drop policy if exists "Authenticated admins can read all houses"
  on public.houses;
drop policy if exists "Authenticated admins can update houses"
  on public.houses;
drop policy if exists "Public can read active houses"
  on public.houses;

drop policy if exists "Authenticated admins can insert districts"
  on public.districts;
drop policy if exists "Public can read districts"
  on public.districts;
drop policy if exists districts_delete_authenticated
  on public.districts;
drop policy if exists districts_insert_authenticated
  on public.districts;
drop policy if exists districts_select_authenticated
  on public.districts;
drop policy if exists districts_update_authenticated
  on public.districts;

drop policy if exists cities_select_authenticated
  on public.cities;
drop policy if exists cities_insert_superadmin
  on public.cities;
drop policy if exists cities_update_superadmin
  on public.cities;
drop policy if exists cities_delete_superadmin
  on public.cities;

-- Public routing remains slug-based. Anonymous visitors retain the same public
-- active-house / districts reads, while authenticated admins no longer inherit
-- those public policies.
create policy houses_public_read_active
on public.houses
for select
to anon
using (is_active = true);

create policy houses_admin_select_scoped
on public.houses
for select
to authenticated
using (public.admin_has_house_access(id));

create policy houses_admin_insert_scoped
on public.houses
for insert
to authenticated
with check (
  district_id is not null
  and public.admin_has_district_access(district_id)
);

create policy houses_admin_update_scoped
on public.houses
for update
to authenticated
using (public.admin_has_house_access(id))
with check (
  public.admin_has_house_access(id)
  and district_id is not null
  and public.admin_has_district_access(district_id)
);

create policy houses_admin_delete_archived_scoped
on public.houses
for delete
to authenticated
using (
  archived_at is not null
  and public.admin_has_house_access(id)
);

create policy districts_public_read
on public.districts
for select
to anon
using (true);

create policy districts_admin_select_scoped
on public.districts
for select
to authenticated
using (public.admin_has_district_access(id));

create policy districts_admin_insert_scoped
on public.districts
for insert
to authenticated
with check (public.admin_city_scope(city_id));

create policy districts_admin_update_scoped
on public.districts
for update
to authenticated
using (public.admin_has_district_access(id))
with check (public.admin_city_scope(city_id));

create policy districts_admin_delete_scoped
on public.districts
for delete
to authenticated
using (public.admin_city_scope(city_id));

create policy cities_select_authenticated
on public.cities
for select
to authenticated
using (public.admin_city_scope(id));

create policy cities_insert_superadmin
on public.cities
for insert
to authenticated
with check (public.admin_is_superadmin());

create policy cities_update_superadmin
on public.cities
for update
to authenticated
using (public.admin_is_superadmin())
with check (public.admin_is_superadmin());

create policy cities_delete_superadmin
on public.cities
for delete
to authenticated
using (public.admin_is_superadmin());

commit;
