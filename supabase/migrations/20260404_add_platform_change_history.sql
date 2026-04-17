create table if not exists public.platform_change_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  actor_admin_id uuid null references public.profiles(id) on delete set null,
  actor_name text null,
  actor_email text null,
  actor_role text null,
  entity_type text not null,
  entity_id text null,
  entity_label text null,
  action_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists platform_change_history_created_at_idx
  on public.platform_change_history (created_at desc);

create index if not exists platform_change_history_action_type_idx
  on public.platform_change_history (action_type);

create index if not exists platform_change_history_entity_type_idx
  on public.platform_change_history (entity_type);

create index if not exists platform_change_history_actor_admin_id_idx
  on public.platform_change_history (actor_admin_id);

alter table public.platform_change_history enable row level security;

drop policy if exists "platform_change_history_select_authenticated" on public.platform_change_history;
create policy "platform_change_history_select_authenticated"
  on public.platform_change_history
  for select
  to authenticated
  using (true);

drop policy if exists "platform_change_history_insert_authenticated" on public.platform_change_history;
create policy "platform_change_history_insert_authenticated"
  on public.platform_change_history
  for insert
  to authenticated
  with check (true);
