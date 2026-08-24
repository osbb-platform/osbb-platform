-- P09 T3b — migrate every legacy manager membership to content_manager.
--
-- Preconditions:
--   - T3a enum value content_manager exists.
--   - Transitional runtime recognizes manager + content_manager with identical
--     legacy content-only semantics.
--   - Transitional get_my_admin_role() recognizes both values.
--
-- IMPORTANT:
--   This migration updates ALL manager rows regardless of membership status:
--   active, invited, inactive, archived, or legacy/null status.
--
-- This migration MUST NOT:
--   - activate the future manager RBAC matrix;
--   - delete the manager enum literal;
--   - touch admin/superadmin/employee role rows.
--
-- Verification after apply:
--   select count(*) from public.admin_memberships
--   where role::text='manager'; -- MUST be 0
--
-- Forward-only rollback:
--   If needed before new manager semantics are activated, a follow-up migration
--   can explicitly move selected content_manager rows back to manager.
--   Never remove enum literals.

begin;

update public.admin_memberships
set role = 'content_manager'::public.admin_role
where role::text = 'manager';

do $$
declare
  remaining_manager_rows bigint;
begin
  select count(*)
  into remaining_manager_rows
  from public.admin_memberships
  where role::text = 'manager';

  if remaining_manager_rows <> 0 then
    raise exception
      'P09 T3b verification failed: % manager rows remain',
      remaining_manager_rows;
  end if;
end
$$;

commit;
