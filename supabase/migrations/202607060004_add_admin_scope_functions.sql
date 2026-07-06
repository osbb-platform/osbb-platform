-- S1.T4 — tenant isolation groundwork.
--
-- This migration intentionally does not modify any RLS policy.
-- S5 will connect these functions to house-bound tables incrementally.
--
-- Compatibility note:
-- current application users are resolved from global memberships where
-- admin_memberships.house_id is null. Only global superadmin/admin
-- memberships receive the temporary single-city scope.
--
-- A manager must have an explicit house_id membership to receive
-- house access through admin_has_house_access().
--
-- Rollback:
--   drop function if exists public.admin_has_house_access(uuid);
--   drop function if exists public.admin_city_scope();

begin;

create or replace function public.admin_city_scope()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.admin_memberships as membership
    where membership.user_id = auth.uid()
      and membership.house_id is null
      and membership.is_active = true
      and membership.status = 'active'
      and membership.role in (
        'superadmin'::public.admin_role,
        'admin'::public.admin_role
      )
  );
$function$;

comment on function public.admin_city_scope() is
  'S1.T4 single-city compatibility scope. Returns true only for an active global superadmin/admin membership. Replaced by real city scope in R1.';

create or replace function public.admin_has_house_access(
  target_house_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    target_house_id is not null
    and exists (
      select 1
      from public.houses as house
      where house.id = target_house_id
    )
    and (
      public.admin_city_scope()
      or exists (
        select 1
        from public.admin_memberships as membership
        where membership.user_id = auth.uid()
          and membership.house_id = target_house_id
          and membership.is_active = true
          and membership.status = 'active'
          and membership.role in (
            'superadmin'::public.admin_role,
            'admin'::public.admin_role,
            'manager'::public.admin_role
          )
      )
    );
$function$;

comment on function public.admin_has_house_access(uuid) is
  'S1.T4 house-scope predicate. Grants access through active single-city admin scope or an active membership assigned to the exact house. Not wired into RLS until S5.';

revoke all
  on function public.admin_city_scope()
  from public, anon, authenticated;

revoke all
  on function public.admin_has_house_access(uuid)
  from public, anon, authenticated;

grant execute
  on function public.admin_city_scope()
  to authenticated;

grant execute
  on function public.admin_has_house_access(uuid)
  to authenticated;

commit;
