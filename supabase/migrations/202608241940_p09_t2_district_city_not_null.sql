-- P09 T2 — finalize district ownership after Zaporizhzhia backfill.
--
-- MUST be applied only after 202608241930_p09_t2_backfill_zaporizhzhia.sql
-- verification proves there are zero districts with city_id IS NULL.
--
-- Preflight:
--   select count(*) from public.districts where city_id is null; -- must be 0
--
-- Verification:
--   select is_nullable from information_schema.columns
--   where table_schema='public'
--     and table_name='districts'
--     and column_name='city_id'; -- NO
--
-- Rollback / forward-fix:
--   alter table public.districts alter column city_id drop not null;

begin;

do $$
declare
  missing_districts bigint;
begin
  select count(*)
  into missing_districts
  from public.districts
  where city_id is null;

  if missing_districts <> 0 then
    raise exception
      'P09 T2 NOT NULL blocked: % districts still have city_id IS NULL',
      missing_districts;
  end if;
end
$$;

alter table public.districts
  alter column city_id set not null;

commit;
