create table if not exists public.house_home_widgets (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null unique references public.houses(id) on delete cascade,
  status_widgets jsonb not null default '[]'::jsonb,
  lock_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists house_home_widgets_house_id_idx
  on public.house_home_widgets (house_id);

create or replace function public.set_house_home_widgets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_house_home_widgets_updated_at on public.house_home_widgets;

create trigger set_house_home_widgets_updated_at
before update on public.house_home_widgets
for each row
execute function public.set_house_home_widgets_updated_at();

alter table public.house_home_widgets enable row level security;

drop policy if exists "house_home_widgets_select_public" on public.house_home_widgets;
create policy "house_home_widgets_select_public"
  on public.house_home_widgets
  for select
  using (true);

drop policy if exists "house_home_widgets_insert_authenticated" on public.house_home_widgets;
create policy "house_home_widgets_insert_authenticated"
  on public.house_home_widgets
  for insert
  to authenticated
  with check (true);

drop policy if exists "house_home_widgets_update_authenticated" on public.house_home_widgets;
create policy "house_home_widgets_update_authenticated"
  on public.house_home_widgets
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "house_home_widgets_delete_authenticated" on public.house_home_widgets;
create policy "house_home_widgets_delete_authenticated"
  on public.house_home_widgets
  for delete
  to authenticated
  using (true);
