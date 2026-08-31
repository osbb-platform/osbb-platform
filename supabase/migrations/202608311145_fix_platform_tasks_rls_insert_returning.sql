begin;

-- S1-T2
-- Problem:
-- platform_tasks_admin_select delegated entirely to
-- admin_has_platform_task_access(id), which self-reads platform_tasks and
-- fails INSERT ... RETURNING for a newly inserted row.
--
-- A direct NOT EXISTS against platform_task_houses inside the SELECT policy
-- is NOT safe because RLS can hide a foreign-city link from the caller,
-- incorrectly making NOT EXISTS true.
--
-- This helper answers only whether the task has any house link, using a
-- SECURITY DEFINER context so the existence check is not distorted by RLS.

create or replace function public.platform_task_has_house_links(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_task_houses th
    where th.task_id = target_task_id
  );
$$;

revoke all on function public.platform_task_has_house_links(uuid) from public, anon;
grant execute on function public.platform_task_has_house_links(uuid)
  to authenticated, service_role;

drop policy if exists platform_tasks_admin_select on public.platform_tasks;

create policy platform_tasks_admin_select
on public.platform_tasks
for select
to authenticated
using (
  (
    public.get_my_admin_role() is not null
    and platform_tasks.created_by = auth.uid()
    and not public.platform_task_has_house_links(platform_tasks.id)
  )
  or public.admin_has_platform_task_access(platform_tasks.id)
);

comment on function public.platform_task_has_house_links(uuid) is
'S1-T2 RLS-safe existence helper; returns only whether any platform_task_houses link exists.';

comment on policy platform_tasks_admin_select on public.platform_tasks is
'S1-T2: active creator can read back a newly inserted unlinked task; once any house link exists, visibility is scope-aware via admin_has_platform_task_access.';

commit;

-- Verification:
-- 1) helper must be SECURITY DEFINER with empty search_path.
-- 2) SELECT policy must call platform_task_has_house_links(platform_tasks.id).
-- 3) active creator INSERT ... RETURNING succeeds.
-- 4) after privileged link to foreign-city house, creator cannot SELECT task.
-- 5) invited/inactive memberships remain rejected.
-- 6) city A cannot create platform_task_houses link to city B.
--
-- Rollback = forward-fix migration; never db reset.
