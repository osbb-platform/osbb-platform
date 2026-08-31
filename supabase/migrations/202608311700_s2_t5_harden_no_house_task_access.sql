-- S2-T5: lock no-house platform task visibility.
--
-- Required remediation semantics:
--   1) superadmin can access;
--   2) an unlinked/no-house task is accessible only to its active creator;
--   3) other admins/managers do not inherit a no-house task merely because
--      they have a global membership;
--   4) house-linked task semantics remain unchanged;
--   5) shared city tasks are out of scope (no platform_tasks.city_id here).
--
-- Active creator is proven by the strict S2-T4 get_my_admin_role():
-- is_active = true AND status = 'active'.
--
-- Forward-only correction strategy:
-- use a follow-up CREATE OR REPLACE FUNCTION if later correction is needed.

create or replace function public.admin_has_platform_task_access(
  target_task_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_tasks as task
    where task.id = target_task_id
      and (
        public.admin_is_superadmin()
        or (
          not exists (
            select 1
            from public.platform_task_houses as th
            where th.task_id = task.id
          )
          and task.created_by = auth.uid()
          and public.get_my_admin_role() is not null
        )
        or (
          exists (
            select 1
            from public.platform_task_houses as th
            where th.task_id = task.id
          )
          and not exists (
            select 1
            from public.platform_task_houses as th
            where th.task_id = task.id
              and not public.admin_has_house_access(th.house_id)
          )
        )
      )
  );
$$;

revoke all on function public.admin_has_platform_task_access(uuid)
from public, anon;

grant execute on function public.admin_has_platform_task_access(uuid)
to authenticated, service_role;
