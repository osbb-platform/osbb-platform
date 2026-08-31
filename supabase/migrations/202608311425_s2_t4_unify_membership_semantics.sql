-- S2-T4: unify membership semantics for get_my_admin_role().
--
-- Precondition established by read-only preflight:
--   admin_memberships.status IS NULL count = 0.
--
-- Therefore no backfill is required and the helper can move directly to:
--   is_active = true AND status = 'active'
--
-- Security boundary from S2-T3 is preserved.
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
  from public.admin_memberships as am
  where am.user_id = auth.uid()
    and am.is_active = true
    and am.status = 'active'
    and am.house_id is null
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
