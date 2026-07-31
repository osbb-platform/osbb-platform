-- P05 T4: plan automation data model.
-- Schema only. Commands, RPC and scheduler are implemented in T5-T6.
-- Existing plan tasks remain unchanged because automation_enabled defaults to false.

alter table public.house_plan_tasks
  add column if not exists automation_enabled boolean not null default false,
  add column if not exists automation_interval_days integer null,
  add column if not exists automation_paused_at timestamptz null,
  add column if not exists automation_anchor_at timestamptz null,
  add column if not exists automation_next_due_at timestamptz null;

comment on column public.house_plan_tasks.automation_enabled is
  'Enables planned -> in_progress -> completed -> archived automation for this task.';
comment on column public.house_plan_tasks.automation_interval_days is
  'Equal calendar-day interval for every automation step. Valid range: 1..365.';
comment on column public.house_plan_tasks.automation_paused_at is
  'UTC timestamp when task automation was paused. While paused, next_due_at is null.';
comment on column public.house_plan_tasks.automation_anchor_at is
  'UTC timestamp from which the current automation interval is calculated.';
comment on column public.house_plan_tasks.automation_next_due_at is
  'Denormalized UTC due timestamp used by the hourly automation job.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_plan_tasks'::regclass
      and conname = 'house_plan_tasks_automation_interval_days_check'
  ) then
    alter table public.house_plan_tasks
      add constraint house_plan_tasks_automation_interval_days_check
      check (
        automation_interval_days is null
        or automation_interval_days between 1 and 365
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_plan_tasks'::regclass
      and conname = 'house_plan_tasks_automation_enabled_interval_check'
  ) then
    alter table public.house_plan_tasks
      add constraint house_plan_tasks_automation_enabled_interval_check
      check (
        automation_enabled = false
        or automation_interval_days is not null
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_plan_tasks'::regclass
      and conname = 'house_plan_tasks_automation_pause_due_check'
  ) then
    alter table public.house_plan_tasks
      add constraint house_plan_tasks_automation_pause_due_check
      check (
        automation_paused_at is null
        or automation_next_due_at is null
      );
  end if;
end;
$$;

create index if not exists house_plan_tasks_automation_due_idx
  on public.house_plan_tasks (automation_next_due_at, id)
  where lifecycle_status = 'published'
    and automation_enabled = true
    and automation_paused_at is null
    and automation_next_due_at is not null;

create table if not exists public.house_plan_status_transitions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null
    references public.house_plan_tasks(id) on delete cascade,
  house_id uuid not null
    references public.houses(id) on delete cascade,
  from_status text not null
    check (from_status in ('planned', 'in_progress', 'completed', 'archived')),
  to_status text not null
    check (to_status in ('planned', 'in_progress', 'completed', 'archived')),
  due_at timestamptz null,
  executed_at timestamptz not null default now(),
  kind text not null
    check (kind in ('automatic', 'manual')),
  actor_admin_id uuid null
    references public.profiles(id) on delete set null,
  configured_interval_days integer null
    check (
      configured_interval_days is null
      or configured_interval_days between 1 and 365
    ),
  constraint house_plan_status_transitions_status_changed_check
    check (from_status <> to_status),
  constraint house_plan_status_transitions_automatic_due_check
    check (kind <> 'automatic' or due_at is not null)
);

comment on table public.house_plan_status_transitions is
  'Immutable audit journal for manual and automatic house plan status transitions.';
comment on column public.house_plan_status_transitions.due_at is
  'Scheduled UTC due timestamp for an automatic transition; nullable for manual transitions.';
comment on column public.house_plan_status_transitions.executed_at is
  'Actual UTC execution timestamp.';
comment on column public.house_plan_status_transitions.actor_admin_id is
  'Admin actor for manual transitions; null for automatic transitions.';

create unique index if not exists house_plan_status_transitions_auto_idempotency_uq
  on public.house_plan_status_transitions (
    task_id,
    from_status,
    to_status,
    due_at
  )
  where kind = 'automatic';

create index if not exists house_plan_status_transitions_task_executed_idx
  on public.house_plan_status_transitions (task_id, executed_at desc);

create index if not exists house_plan_status_transitions_house_executed_idx
  on public.house_plan_status_transitions (house_id, executed_at desc);

alter table public.house_plan_status_transitions enable row level security;

drop policy if exists house_plan_status_transitions_admin_select
  on public.house_plan_status_transitions;
create policy house_plan_status_transitions_admin_select
  on public.house_plan_status_transitions
  for select
  to authenticated
  using (public.is_authenticated_admin());

drop policy if exists house_plan_status_transitions_admin_insert
  on public.house_plan_status_transitions;
create policy house_plan_status_transitions_admin_insert
  on public.house_plan_status_transitions
  for insert
  to authenticated
  with check (
    public.is_authenticated_admin()
    and (
      actor_admin_id is null
      or actor_admin_id = auth.uid()
    )
  );

-- No anonymous/public policy.
-- No UPDATE policy: transition rows are immutable.
-- No DELETE policy: transition rows are immutable.

-- Preflight SQL:
-- select lifecycle_status, task_status, count(*)
-- from public.house_plan_tasks
-- group by lifecycle_status, task_status
-- order by lifecycle_status, task_status;
--
-- Verification SQL:
-- select column_name, is_nullable, column_default
-- from information_schema.columns
-- where table_schema='public'
--   and table_name='house_plan_tasks'
--   and column_name like 'automation_%'
-- order by column_name;
--
-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname='public'
--   and tablename='house_plan_status_transitions'
-- order by policyname;
--
-- select count(*)
-- from public.house_plan_tasks
-- where automation_enabled = true;
-- Expected immediately after T4: 0.
