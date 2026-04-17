create table if not exists public.house_apartments (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  account_number text not null,
  apartment_label text not null,
  owner_name text not null,
  area numeric(10,2) null,
  source_type text not null check (source_type in ('import', 'manual')),
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null
);

create index if not exists house_apartments_house_id_idx
  on public.house_apartments (house_id);

create index if not exists house_apartments_house_archive_idx
  on public.house_apartments (house_id, archived_at);

create index if not exists house_apartments_created_at_idx
  on public.house_apartments (created_at desc);

create index if not exists house_apartments_search_idx
  on public.house_apartments (house_id, apartment_label, owner_name);

create unique index if not exists house_apartments_unique_account_active_idx
  on public.house_apartments (house_id, account_number)
  where archived_at is null;

create unique index if not exists house_apartments_unique_apartment_active_idx
  on public.house_apartments (house_id, apartment_label)
  where archived_at is null;

alter table public.house_apartments enable row level security;

drop policy if exists "house_apartments_select_authenticated" on public.house_apartments;
create policy "house_apartments_select_authenticated"
  on public.house_apartments
  for select
  to authenticated
  using (true);

drop policy if exists "house_apartments_insert_authenticated" on public.house_apartments;
create policy "house_apartments_insert_authenticated"
  on public.house_apartments
  for insert
  to authenticated
  with check (true);

drop policy if exists "house_apartments_update_authenticated" on public.house_apartments;
create policy "house_apartments_update_authenticated"
  on public.house_apartments
  for update
  to authenticated
  using (true)
  with check (true);
