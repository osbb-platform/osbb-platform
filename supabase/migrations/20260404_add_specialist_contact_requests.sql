create table if not exists public.specialist_contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  house_id uuid not null references public.houses(id) on delete cascade,
  house_slug text not null,
  category text not null,
  specialist_label text not null,
  requester_name text not null,
  requester_email text not null,
  apartment text not null,
  comment text null,
  status text not null default 'new'
);

create index if not exists specialist_contact_requests_created_at_idx
  on public.specialist_contact_requests (created_at desc);

create index if not exists specialist_contact_requests_house_id_idx
  on public.specialist_contact_requests (house_id);

create index if not exists specialist_contact_requests_status_idx
  on public.specialist_contact_requests (status);

alter table public.specialist_contact_requests enable row level security;

drop policy if exists "specialist_contact_requests_insert_public" on public.specialist_contact_requests;
create policy "specialist_contact_requests_insert_public"
  on public.specialist_contact_requests
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "specialist_contact_requests_select_authenticated" on public.specialist_contact_requests;
create policy "specialist_contact_requests_select_authenticated"
  on public.specialist_contact_requests
  for select
  to authenticated
  using (true);
