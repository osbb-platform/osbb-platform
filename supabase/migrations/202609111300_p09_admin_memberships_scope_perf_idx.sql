begin;

-- Track 9 (RLS/admin performance): admin_has_house_access() / admin_city_scope()
-- / admin_is_superadmin() are called once per row by every house-scoped
-- SELECT/UPDATE policy (house_apartments, house_meetings, etc). Each call
-- re-runs an EXISTS against admin_memberships filtered on
-- (user_id, house_id IS NULL, is_active, status, city_id, role). Only
-- single-column indexes existed on admin_memberships (user_id, city_id,
-- house_id separately), so each of those hundreds/thousands of per-row
-- calls had to filter down from a broader index scan instead of resolving
-- directly. This is a partial covering index over exactly that hot-path
-- shape (only "currently active, company-wide" rows are ever eligible).
create index if not exists admin_memberships_active_global_scope_idx
  on public.admin_memberships (user_id, city_id)
  include (role)
  where house_id is null and is_active = true and status = 'active';

commit;
