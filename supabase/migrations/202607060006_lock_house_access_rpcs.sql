-- S1.T5 phase 2 — direct house-access RPC lockdown.
--
-- REQUIRED ROLLOUT ORDER:
--   1. apply 202607060004_add_admin_scope_functions.sql;
--   2. apply 202607060005_add_server_rate_limit.sql;
--   3. deploy the compatible application;
--   4. smoke-test resident/admin login, analytics ingest,
--      house creation and house access-code change;
--   5. only then apply this migration.
--
-- Emergency application-compatible rollback:
--   grant execute
--     on function public.create_house_session(
--       text,
--       text,
--       text,
--       integer
--     )
--     to anon, authenticated;
--
--   grant execute
--     on function public.upsert_house_access(uuid, text)
--     to authenticated;

begin;

revoke all
  on function public.create_house_session(
    text,
    text,
    text,
    integer
  )
  from public, anon, authenticated;

grant execute
  on function public.create_house_session(
    text,
    text,
    text,
    integer
  )
  to service_role;

revoke all
  on function public.upsert_house_access(
    uuid,
    text
  )
  from public, anon, authenticated;

grant execute
  on function public.upsert_house_access(
    uuid,
    text
  )
  to service_role;

commit;
