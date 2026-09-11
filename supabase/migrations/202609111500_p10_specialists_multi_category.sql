begin;

-- Track 6: specialists can belong to multiple categories. house_specialists.category
-- stays as-is (primary/compatibility scalar, kept for this release); this adds a
-- normalized M:N join table on top, additively.

-- Composite FKs below require a unique constraint on exactly (id, house_id) on
-- both parent tables (id alone is already unique, but Postgres still requires
-- the referenced column *pair* to be its own unique constraint for a composite
-- FK). Purely additive: does not touch the existing primary keys.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'house_specialists_id_house_id_unique'
      and conrelid = 'public.house_specialists'::regclass
  ) then
    alter table public.house_specialists
      add constraint house_specialists_id_house_id_unique unique (id, house_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'house_specialists_categories_id_house_id_unique'
      and conrelid = 'public.house_specialists_categories'::regclass
  ) then
    alter table public.house_specialists_categories
      add constraint house_specialists_categories_id_house_id_unique unique (id, house_id);
  end if;
end;
$$;

create table if not exists public.house_specialist_categories (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  specialist_id uuid not null,
  category_id uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Tenant integrity: a specialist and a category can only be linked when
  -- they belong to the SAME house. This is enforced at the DB level by
  -- requiring house_id to match on both sides of the composite FK, not just
  -- by application code — the join table can never point a House A
  -- specialist at a House B category, or vice versa.
  constraint house_specialist_categories_specialist_fkey
    foreign key (specialist_id, house_id)
    references public.house_specialists (id, house_id)
    on delete cascade,
  constraint house_specialist_categories_category_fkey
    foreign key (category_id, house_id)
    references public.house_specialists_categories (id, house_id)
    on delete cascade,
  constraint house_specialist_categories_unique_link
    unique (specialist_id, category_id)
);

create index if not exists house_specialist_categories_house_idx
  on public.house_specialist_categories (house_id);
create index if not exists house_specialist_categories_specialist_idx
  on public.house_specialist_categories (specialist_id, sort_order);
create index if not exists house_specialist_categories_category_idx
  on public.house_specialist_categories (category_id);

alter table public.house_specialist_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'house_specialist_categories'
      and policyname = 'p10_house_specialist_categories_admin_scoped'
  ) then
    create policy p10_house_specialist_categories_admin_scoped
      on public.house_specialist_categories
      for all
      to authenticated
      using (admin_has_house_access(house_id))
      with check (admin_has_house_access(house_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'house_specialist_categories'
      and policyname = 'p10_house_specialist_categories_public_read'
  ) then
    create policy p10_house_specialist_categories_public_read
      on public.house_specialist_categories
      for select
      to anon
      using (
        exists (
          select 1
          from public.house_specialists specialist
          where specialist.id = house_specialist_categories.specialist_id
            and specialist.lifecycle_status = 'published'
        )
      );
  end if;
end;
$$;

grant select, insert, update, delete on public.house_specialist_categories to authenticated;
grant select on public.house_specialist_categories to anon;

-- Backfill: every specialist's existing scalar category becomes its first
-- (and, pre-backfill, only) linked category. Idempotent: ON CONFLICT DO
-- NOTHING on the join's unique (specialist_id, category_id), safe to re-run.
insert into public.house_specialist_categories (house_id, specialist_id, category_id, sort_order)
select
  specialist.house_id,
  specialist.id,
  category.id,
  0
from public.house_specialists specialist
join public.house_specialists_categories category
  on category.house_id = specialist.house_id
  and lower(category.title) = lower(specialist.category)
where nullif(trim(specialist.category), '') is not null
on conflict (specialist_id, category_id) do nothing;

-- "Бухгалтер" catalog seed: add to every existing house's catalog if not
-- already present (case-insensitive), placed after existing categories.
-- Idempotent via house_specialists_categories_house_title_unique.
insert into public.house_specialists_categories (house_id, title, sort_order)
select
  h.id,
  'Бухгалтер',
  coalesce((select max(c.sort_order) + 1 from public.house_specialists_categories c where c.house_id = h.id), 0)
from public.houses h
where not exists (
  select 1
  from public.house_specialists_categories c
  where c.house_id = h.id
    and lower(c.title) = lower('Бухгалтер')
);

commit;
