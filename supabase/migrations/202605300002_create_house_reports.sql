create table if not exists public.house_report_categories (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.house_reports (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,

  title text not null,
  description text not null default '',

  category_id uuid null references public.house_report_categories(id) on delete set null,
  category_title text not null default '',

  report_date date null,
  period_type text not null default 'current'
    check (period_type in ('current', 'past')),
  month text null,
  year int null,

  is_pinned boolean not null default false,
  is_new boolean not null default false,
  new_until timestamptz null,

  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version int not null default 1,
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null
);

create index if not exists house_report_categories_house_sort_idx
  on public.house_report_categories (house_id, sort_order);

create unique index if not exists house_report_categories_house_title_unique
  on public.house_report_categories (house_id, lower(title));

create index if not exists house_reports_house_status_idx
  on public.house_reports (house_id, lifecycle_status);

create index if not exists house_reports_house_published_idx
  on public.house_reports (house_id, published_at desc)
  where lifecycle_status = 'published';

create index if not exists house_reports_house_period_idx
  on public.house_reports (house_id, period_type, year, month);

create index if not exists house_reports_house_category_idx
  on public.house_reports (house_id, category_id);

alter table public.house_report_categories enable row level security;
alter table public.house_reports enable row level security;

drop policy if exists "Admins manage house_report_categories"
  on public.house_report_categories;
create policy "Admins manage house_report_categories"
  on public.house_report_categories
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Public read house_report_categories"
  on public.house_report_categories;
create policy "Public read house_report_categories"
  on public.house_report_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage house_reports"
  on public.house_reports;
create policy "Admins manage house_reports"
  on public.house_reports
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Public read published house_reports"
  on public.house_reports;
create policy "Public read published house_reports"
  on public.house_reports
  for select
  to anon, authenticated
  using (lifecycle_status = 'published');
