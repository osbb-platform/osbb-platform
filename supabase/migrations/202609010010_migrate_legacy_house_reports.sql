-- Historical migration tombstone.
--
-- This version exists only to resolve the historical duplicate migration
-- version 202606020001.
--
-- The original migration:
--   202606020001_migrate_legacy_house_reports.sql
-- was created on 2026-06-02 and later renamed to this timestamp.
--
-- IMPORTANT:
-- The legacy house-reports backfill MUST NOT be executed again.
-- On the current production-derived baseline a replay would create
-- additional house_reports / house_content_files rows.
--
-- The original SQL remains available in Git history.
-- This migration intentionally performs no schema or data mutation.

begin;

do $$
begin
  null;
end
$$;

commit;
