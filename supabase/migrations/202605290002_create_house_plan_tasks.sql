create table if not exists public.house_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null,
  description text not null default '',
  date_mode text not null default 'deadline'
    check (date_mode in ('deadline', 'range')),
  deadline_at timestamptz null,
  start_date timestamptz null,
  end_date timestamptz null,
  task_status text not null default 'planned'
    check (task_status in ('planned', 'in_progress', 'completed', 'archived')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  contractor text null,
  archive_year int null
    check (archive_year is null or (archive_year >= 2016 and archive_year <= 2026)),
  sort_order int not null default 0,
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null
);

create index if not exists house_plan_tasks_house_status_idx
  on public.house_plan_tasks (house_id, lifecycle_status);

create index if not exists house_plan_tasks_house_task_status_idx
  on public.house_plan_tasks (house_id, task_status);

create index if not exists house_plan_tasks_house_sort_idx
  on public.house_plan_tasks (house_id, sort_order, updated_at desc);

drop trigger if exists house_plan_tasks_set_updated_at on public.house_plan_tasks;

create trigger house_plan_tasks_set_updated_at
  before update on public.house_plan_tasks
  for each row
  execute function public.set_updated_at();

alter table public.house_plan_tasks enable row level security;

drop policy if exists "Authenticated admins can read house plan tasks" on public.house_plan_tasks;
create policy "Authenticated admins can read house plan tasks"
  on public.house_plan_tasks
  for select
  using (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can insert house plan tasks" on public.house_plan_tasks;
create policy "Authenticated admins can insert house plan tasks"
  on public.house_plan_tasks
  for insert
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can update house plan tasks" on public.house_plan_tasks;
create policy "Authenticated admins can update house plan tasks"
  on public.house_plan_tasks
  for update
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can delete house plan tasks" on public.house_plan_tasks;
create policy "Authenticated admins can delete house plan tasks"
  on public.house_plan_tasks
  for delete
  using (public.is_authenticated_admin());

drop policy if exists "Public can read published house plan tasks" on public.house_plan_tasks;
create policy "Public can read published house plan tasks"
  on public.house_plan_tasks
  for select
  using (lifecycle_status = 'published');

insert into public.house_plan_tasks (
  id,
  house_id,
  title,
  description,
  date_mode,
  deadline_at,
  start_date,
  end_date,
  task_status,
  priority,
  contractor,
  archive_year,
  sort_order,
  lifecycle_status,
  lock_version,
  created_at,
  updated_at,
  published_at,
  archived_at
)
select
  case
    when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (item->>'id')::uuid
    else gen_random_uuid()
  end,
  hp.house_id,
  coalesce(nullif(item->>'title', ''), 'Завдання без назви'),
  coalesce(item->>'description', ''),
  case when item->>'dateMode' = 'range' then 'range' else 'deadline' end,
  case
    when nullif(item->>'deadlineAt', '') is not null
      then (item->>'deadlineAt')::timestamptz
    else null
  end,
  case
    when nullif(item->>'startDate', '') is not null
      then (item->>'startDate')::timestamptz
    else null
  end,
  case
    when nullif(item->>'endDate', '') is not null
      then (item->>'endDate')::timestamptz
    else null
  end,
  case
    when item->>'status' in ('planned', 'in_progress', 'completed', 'archived')
      then item->>'status'
    else 'planned'
  end,
  case
    when item->>'priority' in ('high', 'medium', 'low')
      then item->>'priority'
    else 'medium'
  end,
  nullif(item->>'contractor', ''),
  case
    when (item->>'archiveYear') ~ '^[0-9]+$'
      and (item->>'archiveYear')::int between 2016 and 2026
      then (item->>'archiveYear')::int
    else null
  end,
  ordinality::int - 1,
  case
    when item->>'status' = 'archived' then 'archived'
    when item->>'status' in ('planned', 'in_progress', 'completed') then 'published'
    else 'draft'
  end,
  1,
  coalesce(
    case when nullif(item->>'createdAt', '') is not null then (item->>'createdAt')::timestamptz else null end,
    hs.created_at,
    now()
  ),
  coalesce(
    case when nullif(item->>'updatedAt', '') is not null then (item->>'updatedAt')::timestamptz else null end,
    hs.updated_at,
    now()
  ),
  case
    when item->>'status' in ('planned', 'in_progress', 'completed')
      then coalesce(hs.updated_at, now())
    else null
  end,
  case
    when item->>'status' = 'archived'
      then coalesce(
        case when nullif(item->>'archivedAt', '') is not null then (item->>'archivedAt')::timestamptz else null end,
        hs.updated_at,
        now()
      )
    else null
  end
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(
  case
    when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
      then hs.content->'items'
    else '[]'::jsonb
  end
) with ordinality as source(item, ordinality)
where hs.kind = 'plan'
on conflict (id) do nothing;

insert into public.house_content_files (
  entity_type,
  entity_id,
  field_key,
  storage_bucket,
  storage_path,
  original_file_name,
  uploaded_at
)
select
  'house_plan_task',
  task.id,
  'image_' || (image_ordinality::int - 1),
  'house-plan-media',
  image_item->>'path',
  nullif(image_item->>'fileName', ''),
  coalesce(
    case when nullif(image_item->>'createdAt', '') is not null then (image_item->>'createdAt')::timestamptz else null end,
    task.created_at
  )
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(
  case
    when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
      then hs.content->'items'
    else '[]'::jsonb
  end
) with ordinality as source(item, item_ordinality)
join public.house_plan_tasks task
  on task.house_id = hp.house_id
 and task.sort_order = item_ordinality::int - 1
cross join lateral jsonb_array_elements(
  case
    when item ? 'images' and jsonb_typeof(item->'images') = 'array'
      then item->'images'
    else '[]'::jsonb
  end
) with ordinality as images(image_item, image_ordinality)
where hs.kind = 'plan'
  and image_item->>'path' is not null
on conflict do nothing;

insert into public.house_content_files (
  entity_type,
  entity_id,
  field_key,
  storage_bucket,
  storage_path,
  original_file_name,
  mime_type,
  uploaded_at
)
select
  'house_plan_task',
  task.id,
  'pdf_' || (document_ordinality::int - 1),
  'house-plan-documents',
  document_item->>'path',
  nullif(document_item->>'fileName', ''),
  'application/pdf',
  coalesce(
    case when nullif(document_item->>'createdAt', '') is not null then (document_item->>'createdAt')::timestamptz else null end,
    task.created_at
  )
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(
  case
    when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
      then hs.content->'items'
    else '[]'::jsonb
  end
) with ordinality as source(item, item_ordinality)
join public.house_plan_tasks task
  on task.house_id = hp.house_id
 and task.sort_order = item_ordinality::int - 1
cross join lateral jsonb_array_elements(
  case
    when item ? 'documents' and jsonb_typeof(item->'documents') = 'array'
      then item->'documents'
    else '[]'::jsonb
  end
) with ordinality as documents(document_item, document_ordinality)
where hs.kind = 'plan'
  and document_item->>'path' is not null
on conflict do nothing;
