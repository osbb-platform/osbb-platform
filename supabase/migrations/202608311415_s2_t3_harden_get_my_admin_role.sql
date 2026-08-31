-- S2-T3: harden get_my_admin_role() SECURITY DEFINER search path.
--
-- Scope:
--   - preserve current role-selection semantics exactly;
--   - pin empty search_path for SECURITY DEFINER safety;
--   - keep all object references schema-qualified;
--   - preserve existing EXECUTE boundary.
--
-- S2-T4 membership status semantics are intentionally NOT changed here.
--
-- Forward-only correction strategy:
--   use a follow-up CREATE OR REPLACE FUNCTION if needed.

create or replace function public.get_my_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
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
