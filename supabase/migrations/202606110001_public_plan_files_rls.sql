-- Allow public plan pages to read plan task attachments from Content Engine v2.
-- Public plan tasks are loaded from house_plan_tasks, while images/PDF are stored in house_content_files.

drop policy if exists "Public can read house plan task files" on public.house_content_files;

create policy "Public can read house plan task files"
on public.house_content_files
for select
to anon, authenticated
using (
  entity_type = 'house_plan_task'
  and exists (
    select 1
    from public.house_plan_tasks task
    join public.houses h on h.id = task.house_id
    where task.id = house_content_files.entity_id
      and task.lifecycle_status in ('published', 'archived')
      and h.is_active = true
      and h.archived_at is null
  )
);
