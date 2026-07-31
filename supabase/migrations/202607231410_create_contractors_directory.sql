-- P05 T1: global contractor directory foundation.
-- Additive migration. No house_plan_tasks backfill in this task.

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  city_id uuid null,
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contractors_name_not_blank check (btrim(name) <> ''),
  constraint contractors_normalized_name_not_blank check (btrim(normalized_name) <> '')
);

comment on table public.contractors is
  'Global contractor directory for house plan tasks. city_id is reserved for P09 and intentionally has no FK.';

comment on column public.contractors.name is
  'Official display spelling. Do not rewrite or autocorrect.';
comment on column public.contractors.normalized_name is
  'Anti-duplicate key: lowercase, trimmed and internal whitespace collapsed.';
comment on column public.contractors.city_id is
  'Reserved nullable P09 scope. No foreign key before P09.';

create or replace function public.normalize_contractor_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(
    btrim(
      regexp_replace(value, '\s+', ' ', 'g')
    )
  );
$$;

create or replace function public.contractors_normalize_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.normalized_name := public.normalize_contractor_name(new.name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists contractors_normalize_name_trigger on public.contractors;
create trigger contractors_normalize_name_trigger
before insert or update of name
on public.contractors
for each row
execute function public.contractors_normalize_name();

create unique index if not exists contractors_global_normalized_name_uq
  on public.contractors (normalized_name)
  where city_id is null;

create index if not exists contractors_active_name_idx
  on public.contractors (is_active, normalized_name);

alter table public.contractors enable row level security;

drop policy if exists contractors_authenticated_select on public.contractors;
create policy contractors_authenticated_select
on public.contractors
for select
to authenticated
using (true);

drop policy if exists contractors_plan_editor_insert on public.contractors;
create policy contractors_plan_editor_insert
on public.contractors
for insert
to authenticated
with check (
  public.get_my_admin_role()::text in ('superadmin', 'admin', 'manager')
);

drop policy if exists contractors_plan_editor_update on public.contractors;
create policy contractors_plan_editor_update
on public.contractors
for update
to authenticated
using (
  public.get_my_admin_role()::text in ('superadmin', 'admin', 'manager')
)
with check (
  public.get_my_admin_role()::text in ('superadmin', 'admin', 'manager')
);

-- No DELETE policy by design:
-- contractors are deactivated with is_active=false and are not physically deleted.

insert into public.contractors (name, normalized_name)
values
  ('ТОВ УЮТНИЙ ДОМ КК', public.normalize_contractor_name('ТОВ УЮТНИЙ ДОМ КК')),
  ('ФОП Резнік О.П.', public.normalize_contractor_name('ФОП Резнік О.П.')),
  ('ТОВ "БК ЄМАЙБУТНЄ"', public.normalize_contractor_name('ТОВ "БК ЄМАЙБУТНЄ"')),
  ('ФОП Шпорт Г.О.', public.normalize_contractor_name('ФОП Шпорт Г.О.')),
  ('ТОВ Сансет Ліфтсервіс Запоріжжя', public.normalize_contractor_name('ТОВ Сансет Ліфтсервіс Запоріжжя')),
  ('ФОП Строкач С.С', public.normalize_contractor_name('ФОП Строкач С.С')),
  ('ФОП Фісун О.Г.', public.normalize_contractor_name('ФОП Фісун О.Г.')),
  ('ТОВ Ремонтник-96', public.normalize_contractor_name('ТОВ Ремонтник-96')),
  ('ТОВ ЕСКО ЗАПОРІЖЖЯ', public.normalize_contractor_name('ТОВ ЕСКО ЗАПОРІЖЖЯ')),
  ('ФОП Мамаєвський Д. В.', public.normalize_contractor_name('ФОП Мамаєвський Д. В.')),
  ('ФОП Нагалюк А.Г.', public.normalize_contractor_name('ФОП Нагалюк А.Г.')),
  ('ФОП Свергун В.В.', public.normalize_contractor_name('ФОП Свергун В.В.')),
  ('ФОП Назін В.В.', public.normalize_contractor_name('ФОП Назін В.В.')),
  ('ФОП Прігладь Я.В.', public.normalize_contractor_name('ФОП Прігладь Я.В.')),
  ('ТОВ "Євродім Запоріжжя"', public.normalize_contractor_name('ТОВ "Євродім Запоріжжя"')),
  ('ТОВ КОМІНСАЙТ', public.normalize_contractor_name('ТОВ КОМІНСАЙТ')),
  ('ФОП Скочій В.М.', public.normalize_contractor_name('ФОП Скочій В.М.')),
  ('ФОП Живоглядова С.В.', public.normalize_contractor_name('ФОП Живоглядова С.В.')),
  ('ФОП Баллієт А.Ю.', public.normalize_contractor_name('ФОП Баллієт А.Ю.')),
  ('ФОП Хохлов О.І.', public.normalize_contractor_name('ФОП Хохлов О.І.'))
on conflict (normalized_name) where city_id is null
do nothing;

-- Verification SQL:
-- select count(*) from public.contractors where city_id is null;
-- select name, normalized_name, is_active from public.contractors order by normalized_name;
-- select normalized_name, count(*) from public.contractors
-- group by normalized_name having count(*) > 1;
-- select count(*) from pg_policies
-- where schemaname='public' and tablename='contractors';
