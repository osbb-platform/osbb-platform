-- P09 T1 — finalize cities + nullable city scope columns + cities RLS.
--
-- R0.1 intentionally pulled forward the minimum additive city substrate needed
-- for tenant isolation. T1 does NOT seed a city, does NOT backfill city_id and
-- does NOT make districts.city_id NOT NULL. Those operations remain T2.
--
-- Preflight (READ ONLY):
--   select to_regclass('public.cities');
--   select column_name, is_nullable
--   from information_schema.columns
--   where table_schema='public'
--     and ((table_name='districts' and column_name='city_id')
--       or (table_name='admin_memberships' and column_name='city_id'));
--   select policyname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname='public' and tablename='cities'
--   order by policyname;
--
-- Verification after apply:
--   select count(*) from public.cities; -- unchanged by T1
--   select count(*) from public.districts where city_id is not null; -- unchanged by T1
--   select count(*) from public.admin_memberships where city_id is not null; -- unchanged by T1
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='cities'
--   order by policyname;
--
-- Rollback / forward-fix:
--   Keep additive cities/city_id schema. If policy behaviour must be reverted,
--   ship a forward-fix that restores the previous cities policies. Do not drop
--   cities or city_id in production.

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

-- Authenticated principals need table privileges; RLS remains the authority
-- deciding which rows/actions are permitted.
revoke all on table public.cities from anon;
grant select, insert, update, delete on table public.cities to authenticated;

drop policy if exists cities_select_authenticated on public.cities;
create policy cities_select_authenticated
  on public.cities
  for select
  to authenticated
  using (public.admin_city_scope(id));

drop policy if exists cities_insert_superadmin on public.cities;
create policy cities_insert_superadmin
  on public.cities
  for insert
  to authenticated
  with check (public.admin_is_superadmin());

drop policy if exists cities_update_superadmin on public.cities;
create policy cities_update_superadmin
  on public.cities
  for update
  to authenticated
  using (public.admin_is_superadmin())
  with check (public.admin_is_superadmin());

drop policy if exists cities_delete_superadmin on public.cities;
create policy cities_delete_superadmin
  on public.cities
  for delete
  to authenticated
  using (public.admin_is_superadmin());

commit;
