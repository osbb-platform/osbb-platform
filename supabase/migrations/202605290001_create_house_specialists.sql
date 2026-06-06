create table if not exists public.house_specialists (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null,
  category text not null default '',
  phones jsonb not null default '[]'::jsonb,
  email text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null
);

create table if not exists public.house_specialists_categories (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create index if not exists house_specialists_house_status_idx
  on public.house_specialists (house_id, lifecycle_status);

create index if not exists house_specialists_house_category_idx
  on public.house_specialists (house_id, category);

create index if not exists house_specialists_house_sort_idx
  on public.house_specialists (house_id, sort_order);

create index if not exists house_specialists_categories_house_sort_idx
  on public.house_specialists_categories (house_id, sort_order);

create unique index if not exists house_specialists_categories_house_title_unique
  on public.house_specialists_categories (house_id, lower(title));

alter table public.house_specialists enable row level security;
alter table public.house_specialists_categories enable row level security;

drop policy if exists "Admins can manage house specialists" on public.house_specialists;
create policy "Admins can manage house specialists"
  on public.house_specialists
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read published house specialists" on public.house_specialists;
create policy "Public can read published house specialists"
  on public.house_specialists
  for select
  to anon, authenticated
  using (lifecycle_status = 'published');

drop policy if exists "Admins can manage house specialists categories" on public.house_specialists_categories;
create policy "Admins can manage house specialists categories"
  on public.house_specialists_categories
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read house specialists categories" on public.house_specialists_categories;
create policy "Public can read house specialists categories"
  on public.house_specialists_categories
  for select
  to anon, authenticated
  using (true);

insert into public.house_specialists (
  id,
  house_id,
  title,
  category,
  phones,
  email,
  description,
  sort_order,
  lifecycle_status,
  lock_version,
  created_at,
  updated_at,
  published_at,
  archived_at
)
select
  case
    when specialist_data->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (specialist_data->>'id')::uuid
    else gen_random_uuid()
  end,
  hp.house_id,
  coalesce(nullif(trim(coalesce(specialist_data->>'title', specialist_data->>'label', '')), ''), 'Без назви'),
  coalesce(
    nullif(trim(specialist_data->>'category'), ''),
    nullif(trim(specialist_data->'categories'->>0), ''),
    ''
  ),
  case
    when jsonb_typeof(specialist_data->'phones') = 'array'
      then specialist_data->'phones'
    when nullif(trim(specialist_data->>'phone'), '') is not null
      then jsonb_build_array(trim(specialist_data->>'phone'))
    else '[]'::jsonb
  end,
  coalesce(nullif(trim(specialist_data->>'email'), ''), ''),
  coalesce(
    nullif(trim(specialist_data->>'description'), ''),
    nullif(trim(specialist_data->>'officeHours'), ''),
    ''
  ),
  case
    when specialist_data->>'sortOrder' ~ '^-?\d+$'
      then (specialist_data->>'sortOrder')::int
    else ordinality::int - 1
  end,
  case
    when specialist_data->>'status' = 'active' then 'published'
    when specialist_data->>'status' in ('draft', 'archived') then specialist_data->>'status'
    else 'draft'
  end,
  1,
  case
    when nullif(trim(specialist_data->>'createdAt'), '') is not null
      then (specialist_data->>'createdAt')::timestamptz
    else coalesce(hs.created_at, now())
  end,
  case
    when nullif(trim(specialist_data->>'updatedAt'), '') is not null
      then (specialist_data->>'updatedAt')::timestamptz
    else coalesce(hs.updated_at, now())
  end,
  case
    when specialist_data->>'status' = 'active'
      then case
        when nullif(trim(specialist_data->>'updatedAt'), '') is not null
          then (specialist_data->>'updatedAt')::timestamptz
        else coalesce(hs.updated_at, now())
      end
    else null
  end,
  case
    when specialist_data->>'status' = 'archived'
      then case
        when nullif(trim(specialist_data->>'archivedAt'), '') is not null
          then (specialist_data->>'archivedAt')::timestamptz
        else coalesce(hs.updated_at, now())
      end
    else null
  end
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(hs.content->'specialists') with ordinality as t(specialist_data, ordinality)
where hs.kind = 'specialists'
  and hs.content ? 'specialists'
  and jsonb_typeof(hs.content->'specialists') = 'array'
on conflict (id) do nothing;

insert into public.house_specialists_categories (
  house_id,
  title,
  sort_order
)
select distinct on (hp.house_id, lower(trim(category_data #>> '{}')))
  hp.house_id,
  trim(category_data #>> '{}'),
  ordinality::int - 1
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(hs.content->'categoriesCatalog') with ordinality as t(category_data, ordinality)
where hs.kind = 'specialists'
  and hs.content ? 'categoriesCatalog'
  and jsonb_typeof(hs.content->'categoriesCatalog') = 'array'
  and nullif(trim(category_data #>> '{}'), '') is not null
on conflict do nothing;

insert into public.house_specialists_categories (
  house_id,
  title,
  sort_order
)
select distinct on (house_id, lower(category))
  house_id,
  category,
  1000 + row_number() over (partition by house_id order by category)
from public.house_specialists
where nullif(trim(category), '') is not null
on conflict do nothing;
