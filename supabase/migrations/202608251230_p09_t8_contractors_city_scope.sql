-- P09 T8: contractors city FK + scope.
-- Existing city_id IS NULL rows intentionally remain global/common.
-- No contractor backfill is allowed in this migration.
--
-- Forward-fix rollback recipe:
--   1. restore previous contractor RLS policies if emergency access rollback is needed;
--   2. keep the FK and indexes additive unless a separate reviewed migration removes them.
-- Never mass-backfill global contractors to a city.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contractors_city_id_fkey'
      and conrelid = 'public.contractors'::regclass
  ) then
    alter table public.contractors
      add constraint contractors_city_id_fkey
      foreign key (city_id)
      references public.cities(id)
      on delete restrict;
  end if;
end
$$;

create unique index if not exists contractors_city_normalized_name_uq
  on public.contractors (city_id, normalized_name)
  where city_id is not null;

create index if not exists contractors_city_active_name_idx
  on public.contractors (city_id, is_active, normalized_name);

comment on column public.contractors.city_id is
  'P09 scope: NULL = global/common contractor; non-NULL = city-scoped contractor.';

grant select, insert, update
on table public.contractors
to authenticated;

drop policy if exists contractors_authenticated_select on public.contractors;
drop policy if exists contractors_plan_editor_insert on public.contractors;
drop policy if exists contractors_plan_editor_update on public.contractors;

drop policy if exists contractors_authenticated_select_scoped on public.contractors;
create policy contractors_authenticated_select_scoped
on public.contractors
for select
to authenticated
using (
  city_id is null
  or public.admin_city_scope(city_id)
);

drop policy if exists contractors_plan_editor_insert_scoped on public.contractors;
create policy contractors_plan_editor_insert_scoped
on public.contractors
for insert
to authenticated
with check (
  city_id is not null
  and created_by = auth.uid()
  and public.get_my_admin_role()::text in (
    'superadmin',
    'admin',
    'manager',
    'content_manager'
  )
  and public.admin_city_scope(city_id)
);

drop policy if exists contractors_city_admin_update_scoped on public.contractors;
create policy contractors_city_admin_update_scoped
on public.contractors
for update
to authenticated
using (
  (
    city_id is null
    and public.admin_is_superadmin()
  )
  or
  (
    city_id is not null
    and public.get_my_admin_role()::text in ('superadmin', 'admin')
    and public.admin_city_scope(city_id)
  )
)
with check (
  (
    city_id is null
    and public.admin_is_superadmin()
  )
  or
  (
    city_id is not null
    and public.get_my_admin_role()::text in ('superadmin', 'admin')
    and public.admin_city_scope(city_id)
  )
);

commit;
