create table if not exists public.platform_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  created_by uuid null references public.profiles(id) on delete set null,
  assigned_to uuid null references public.profiles(id) on delete set null,

  title text not null,
  description text null,

  task_type text not null default 'manual'
    check (
      task_type in (
        'manual',
        'draft_approval',
        'resident_request',
        'specialist_request',
        'system'
      )
    ),

  status text not null default 'todo'
    check (
      status in (
        'todo',
        'in_progress',
        'review',
        'done'
      )
    ),

  priority text null
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  deadline_at timestamptz null,
  completed_at timestamptz null,
  archived_at timestamptz null,
  deleted_at timestamptz null,

  house_section text null,

  is_manual boolean not null default true,
  is_overdue boolean not null default false,

  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.platform_task_houses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.platform_tasks(id) on delete cascade,
  house_id uuid not null references public.houses(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.platform_tasks(id) on delete cascade,
  author_id uuid null references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.platform_tasks(id) on delete cascade,
  actor_id uuid null references public.profiles(id) on delete set null,

  event_type text not null,
  action_label text not null,

  before_value text null,
  after_value text null,

  created_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.platform_task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.platform_tasks(id) on delete cascade,

  link_type text not null
    check (
      link_type in (
        'draft',
        'resident_request',
        'specialist_request',
        'system_event'
      )
    ),

  entity_type text not null,
  entity_id text not null,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_tasks_status_idx
  on public.platform_tasks (status);

create index if not exists platform_tasks_assigned_to_idx
  on public.platform_tasks (assigned_to);

create index if not exists platform_tasks_created_by_idx
  on public.platform_tasks (created_by);

create index if not exists platform_tasks_deadline_idx
  on public.platform_tasks (deadline_at);

create index if not exists platform_tasks_archived_idx
  on public.platform_tasks (archived_at);

create index if not exists platform_tasks_created_at_idx
  on public.platform_tasks (created_at desc);

create index if not exists platform_task_houses_task_idx
  on public.platform_task_houses (task_id);

create index if not exists platform_task_houses_house_idx
  on public.platform_task_houses (house_id);

create index if not exists platform_task_comments_task_idx
  on public.platform_task_comments (task_id);

create index if not exists platform_task_events_task_idx
  on public.platform_task_events (task_id);

create index if not exists platform_task_links_task_idx
  on public.platform_task_links (task_id);

create unique index if not exists platform_task_houses_unique_idx
  on public.platform_task_houses (task_id, house_id);

alter table public.platform_tasks enable row level security;
alter table public.platform_task_houses enable row level security;
alter table public.platform_task_comments enable row level security;
alter table public.platform_task_events enable row level security;
alter table public.platform_task_links enable row level security;

create or replace function public.cleanup_platform_tasks()
returns void
language plpgsql
security definer
as $$
begin
  update public.platform_tasks
  set
    archived_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where
    status = 'done'
    and archived_at is null
    and completed_at is not null
    and completed_at < timezone('utc', now()) - interval '7 days';

  delete from public.platform_tasks
  where
    archived_at is not null
    and archived_at < timezone('utc', now()) - interval '30 days';
end;
$$;

comment on function public.cleanup_platform_tasks()
is 'Автоархивация выполненных задач через 7 дней и удаление архивных через 30 дней.';
