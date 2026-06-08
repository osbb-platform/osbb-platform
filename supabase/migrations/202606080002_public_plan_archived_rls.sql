-- Allow public pages to read archived plan tasks for active houses.
-- Architecture 2.0 public plan page has an archive tab, so archived tasks are public-visible content.

drop policy if exists "Public can read published house plan tasks" on public.house_plan_tasks;
drop policy if exists "Public can read published and archived house plan tasks" on public.house_plan_tasks;

create policy "Public can read published and archived house plan tasks"
on public.house_plan_tasks
for select
to anon, authenticated
using (
  lifecycle_status in ('published', 'archived')
  and exists (
    select 1
    from public.houses h
    where h.id = house_plan_tasks.house_id
      and h.is_active = true
      and h.archived_at is null
  )
);
