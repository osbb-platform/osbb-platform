-- P09 T4 transitional DB compatibility.
--
-- Purpose:
--   Teach the legacy DB helper get_my_admin_role() about content_manager
--   BEFORE T3b migrates manager rows to content_manager.
--
-- This migration intentionally does NOT:
--   - update admin_memberships;
--   - change manager semantics;
--   - grant new manager permissions;
--   - remove legacy enum literals.
--
-- Existing helper semantics are preserved:
--   active global membership only, active/null legacy status compatibility,
--   same role priority order with content_manager inserted after manager.
--
-- Forward-only rollback strategy:
--   use a follow-up CREATE OR REPLACE FUNCTION if correction is needed.

create or replace function public.get_my_admin_role()
returns text
language sql
stable
security definer
as $$
  select am.role::text
  from public.admin_memberships am
  where am.user_id = auth.uid()
    and am.is_active = true
    and am.house_id is null
    and (
      am.status is null
      or am.status = 'active'
    )
  order by
    case am.role::text
      when 'superadmin' then 1
      when 'admin' then 2
      when 'manager' then 3
      when 'content_manager' then 4
      when 'super_admin' then 5
      when 'employee' then 6
      else 100
    end
  limit 1;
$$;

revoke all on function public.get_my_admin_role() from public, anon;
grant execute on function public.get_my_admin_role() to authenticated, service_role;
