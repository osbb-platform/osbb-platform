create table public.house_visitor_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  house_id uuid not null references public.houses(id) on delete cascade,
  session_id text not null,
  event_type text not null check (
    event_type in (
      'site_visit',
      'password_success',
      'password_fail',
      'section_view',
      'contact_request_submitted',
      'document_open'
    )
  ),
  section_key text null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_hve_house_time
  on public.house_visitor_events (house_id, occurred_at desc);

create index idx_hve_house_type_time
  on public.house_visitor_events (house_id, event_type, occurred_at desc);

create index idx_hve_session
  on public.house_visitor_events (session_id);

alter table public.house_visitor_events enable row level security;

create policy "Public insert house visitor events"
  on public.house_visitor_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.houses h
      where h.id = house_id
    )
  );

create policy "Admins read house visitor events"
  on public.house_visitor_events
  for select
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  );
