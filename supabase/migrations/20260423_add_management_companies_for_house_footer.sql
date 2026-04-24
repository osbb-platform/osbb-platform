create table if not exists public.management_companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  slogan text null,
  phone text null,
  email text null,
  address text null,
  work_schedule text null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.management_companies is
  'Довідник керуючих компаній для прив’язки до будинків та public footer';

comment on column public.management_companies.slug is
  'Системний slug керуючої компанії';

comment on column public.management_companies.work_schedule is
  'Графік роботи для відображення у footer будинку';

insert into public.management_companies (
  slug,
  name,
  slogan,
  phone,
  email,
  address,
  work_schedule,
  is_active
)
values (
  'tov-bukhhalter-onlain',
  'ТОВ Бухгалтер онлайн',
  'Робимо те, у що віримо',
  '+38066-319-29-55',
  'scotc7542@gmail.com',
  'м. Запоріжжя, вул. Академіка Амосова, буд. 79',
  'Понеділок - П’ятниця 09:00 - 18:00',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  slogan = excluded.slogan,
  phone = excluded.phone,
  email = excluded.email,
  address = excluded.address,
  work_schedule = excluded.work_schedule,
  is_active = excluded.is_active;

alter table public.houses
add column if not exists management_company_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'houses_management_company_id_fkey'
  ) then
    alter table public.houses
      add constraint houses_management_company_id_fkey
      foreign key (management_company_id)
      references public.management_companies(id)
      on delete restrict;
  end if;
end $$;

create index if not exists houses_management_company_id_idx
  on public.houses (management_company_id);

update public.houses
set management_company_id = company.id
from public.management_companies company
where company.slug = 'tov-bukhhalter-onlain'
  and public.houses.management_company_id is null;

alter table public.houses
alter column management_company_id set not null;

comment on column public.houses.management_company_id is
  'Прив’язка будинку до керуючої компанії для public footer та CMS';

create or replace function public.set_management_companies_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists management_companies_set_updated_at
on public.management_companies;

create trigger management_companies_set_updated_at
before update on public.management_companies
for each row
execute function public.set_management_companies_updated_at();
