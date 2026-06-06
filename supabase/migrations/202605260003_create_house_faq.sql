create table if not exists public.house_faq (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null unique references public.houses(id) on delete cascade,
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null
);

create table if not exists public.house_faq_items (
  id uuid primary key default gen_random_uuid(),
  faq_id uuid not null references public.house_faq(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order integer not null default 0
);

create index if not exists house_faq_house_id_lifecycle_status_idx
  on public.house_faq (house_id, lifecycle_status);

create index if not exists house_faq_items_faq_id_sort_order_idx
  on public.house_faq_items (faq_id, sort_order);

alter table public.house_faq enable row level security;
alter table public.house_faq_items enable row level security;

drop policy if exists "house_faq_select_public" on public.house_faq;
create policy "house_faq_select_public"
  on public.house_faq
  for select
  using (lifecycle_status = 'published');

drop policy if exists "house_faq_insert_authenticated" on public.house_faq;
create policy "house_faq_insert_authenticated"
  on public.house_faq
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "house_faq_update_authenticated" on public.house_faq;
create policy "house_faq_update_authenticated"
  on public.house_faq
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "house_faq_delete_authenticated" on public.house_faq;
create policy "house_faq_delete_authenticated"
  on public.house_faq
  for delete
  using (auth.role() = 'authenticated');

drop policy if exists "house_faq_items_select_public" on public.house_faq_items;
create policy "house_faq_items_select_public"
  on public.house_faq_items
  for select
  using (
    exists (
      select 1
      from public.house_faq faq
      where faq.id = house_faq_items.faq_id
        and faq.lifecycle_status = 'published'
    )
  );

drop policy if exists "house_faq_items_insert_authenticated" on public.house_faq_items;
create policy "house_faq_items_insert_authenticated"
  on public.house_faq_items
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "house_faq_items_update_authenticated" on public.house_faq_items;
create policy "house_faq_items_update_authenticated"
  on public.house_faq_items
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "house_faq_items_delete_authenticated" on public.house_faq_items;
create policy "house_faq_items_delete_authenticated"
  on public.house_faq_items
  for delete
  using (auth.role() = 'authenticated');
