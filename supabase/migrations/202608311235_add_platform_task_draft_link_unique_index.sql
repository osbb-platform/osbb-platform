begin;

-- S1-T4 preflight guard:
-- never create the unique draft-link index while duplicate logical draft links exist.
do $$
begin
  if exists (
    select 1
    from public.platform_task_links
    where link_type = 'draft'
    group by link_type, entity_type, entity_id
    having count(*) > 1
  ) then
    raise exception
      'S1_T4_DUPLICATE_DRAFT_LINKS_EXIST: repair duplicates before creating platform_task_links_draft_uq'
      using errcode = '23505';
  end if;
end
$$;

create unique index if not exists platform_task_links_draft_uq
on public.platform_task_links(link_type, entity_type, entity_id)
where link_type='draft';

commit;

-- Verification:
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname='public'
--   and tablename='platform_task_links'
--   and indexname='platform_task_links_draft_uq';
--
-- Forward-fix rollback note:
-- do not DROP this protection in production.
-- If rollout exposes an unforeseen compatibility issue, ship a forward migration
-- after incident review rather than weakening draft-link uniqueness silently.
