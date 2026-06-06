create table public.house_content_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  actor_admin_id uuid null,
  actor_name text null,
  actor_email text null,
  actor_role text null,

  house_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,

  action text not null,
  description text not null,

  before_snapshot jsonb null,
  after_snapshot jsonb null,
  metadata jsonb not null default '{}'::jsonb
);

create index house_content_history_house_idx
  on public.house_content_history (house_id, created_at desc);

create index house_content_history_entity_idx
  on public.house_content_history (entity_type, entity_id, created_at desc);

create index house_content_history_actor_idx
  on public.house_content_history (actor_admin_id, created_at desc);

alter table public.house_content_history enable row level security;

create policy "Admins manage house_content_history"
  on public.house_content_history
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  );

create policy "Authenticated read house_content_history"
  on public.house_content_history
  for select
  to authenticated
  using (true);
