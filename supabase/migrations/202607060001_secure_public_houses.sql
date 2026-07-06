begin;

create or replace function public.is_public_house_active(
  target_house_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.houses house
    where house.id = target_house_id
      and house.is_active = true
      and house.archived_at is null
  );
$$;

revoke all
  on function public.is_public_house_active(uuid)
  from public;

grant execute
  on function public.is_public_house_active(uuid)
  to anon, authenticated;

create or replace view public.public_houses
with (security_barrier = true)
as
select
  house.id,
  house.district_id,
  house.management_company_id,
  house.name,
  house.slug,
  house.address,
  house.osbb_name,
  house.short_description,
  house.public_description,
  house.cover_image_path,
  house.tariff_amount,
  house.is_active,
  case
    when district.id is null then null
    else jsonb_build_object(
      'id', district.id,
      'name', district.name,
      'slug', district.slug,
      'theme_color', district.theme_color
    )
  end as district,
  case
    when company.id is null then null
    else jsonb_build_object(
      'id', company.id,
      'slug', company.slug,
      'name', company.name,
      'slogan', company.slogan,
      'phone', company.phone,
      'email', company.email,
      'address', company.address,
      'work_schedule', company.work_schedule,
      'is_active', company.is_active
    )
  end as management_company
from public.houses house
left join public.districts district
  on district.id = house.district_id
left join public.management_companies company
  on company.id = house.management_company_id
where house.is_active = true
  and house.archived_at is null;

comment on view public.public_houses is
  'Safe public projection of active houses without access credentials.';

revoke all
  on table public.public_houses
  from public;

grant select
  on table public.public_houses
  to anon, authenticated;

drop policy if exists "Public can read active houses"
  on public.houses;

revoke select
  on table public.houses
  from anon;

revoke select
  on table public.houses
  from public;

grant select
  on table public.houses
  to authenticated;

drop policy if exists "Public insert house visitor events"
  on public.house_visitor_events;

create policy "Public insert house visitor events"
  on public.house_visitor_events
  for insert
  to anon, authenticated
  with check (
    public.is_public_house_active(house_id)
  );

drop policy if exists
  "Public can read published house plan tasks"
  on public.house_plan_tasks;

drop policy if exists
  "Public can read published and archived house plan tasks"
  on public.house_plan_tasks;

create policy
  "Public can read published and archived house plan tasks"
  on public.house_plan_tasks
  for select
  to anon, authenticated
  using (
    lifecycle_status in ('published', 'archived')
    and public.is_public_house_active(house_id)
  );

drop policy if exists
  "Public can read house plan task files"
  on public.house_content_files;

create policy "Public can read house plan task files"
  on public.house_content_files
  for select
  to anon, authenticated
  using (
    entity_type = 'house_plan_task'
    and exists (
      select 1
      from public.house_plan_tasks task
      where task.id = house_content_files.entity_id
        and task.lifecycle_status in (
          'published',
          'archived'
        )
        and public.is_public_house_active(
          task.house_id
        )
    )
  );

commit;
