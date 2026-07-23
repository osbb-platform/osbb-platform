-- OSBB P05 T2 — READ-ONLY contractor backfill preview
--
-- Guarantees:
--   * SELECT-only;
--   * no temporary or permanent writes;
--   * no contractor spelling is changed;
--   * no house_plan_tasks row is updated.
--
-- Run only after the T1 and T2 phase-1 migrations exist in the target database.

with legacy as (
  select
    hpt.contractor as legacy_name,
    public.normalize_contractor_name(hpt.contractor) as normalized_name,
    count(*)::bigint as task_count,
    array_agg(hpt.id order by hpt.id) as task_ids
  from public.house_plan_tasks hpt
  where hpt.contractor is not null
    and btrim(hpt.contractor) <> ''
    and hpt.contractor_id is null
  group by
    hpt.contractor,
    public.normalize_contractor_name(hpt.contractor)
),
matches as (
  select
    legacy.legacy_name,
    legacy.normalized_name,
    legacy.task_count,
    legacy.task_ids,
    count(c.id)::integer as match_count,
    min(c.id) as proposed_contractor_id,
    min(c.name) as proposed_contractor_name,
    bool_or(c.is_active) as has_active_match
  from legacy
  left join public.contractors c
    on c.normalized_name = legacy.normalized_name
   and c.city_id is null
  group by
    legacy.legacy_name,
    legacy.normalized_name,
    legacy.task_count,
    legacy.task_ids
)
select
  case
    when match_count = 1 and has_active_match then 'EXACT_ACTIVE'
    when match_count = 1 and not has_active_match then 'EXACT_INACTIVE'
    when match_count = 0 then 'MISSING'
    else 'AMBIGUOUS'
  end as decision,
  legacy_name,
  normalized_name,
  task_count,
  match_count,
  proposed_contractor_id,
  proposed_contractor_name,
  has_active_match,
  task_ids
from matches
order by
  case
    when match_count = 1 and has_active_match then 1
    when match_count = 1 and not has_active_match then 2
    when match_count = 0 then 3
    else 4
  end,
  normalized_name,
  legacy_name;

-- Summary:
with legacy as (
  select
    public.normalize_contractor_name(hpt.contractor) as normalized_name,
    count(*)::bigint as task_count
  from public.house_plan_tasks hpt
  where hpt.contractor is not null
    and btrim(hpt.contractor) <> ''
    and hpt.contractor_id is null
  group by public.normalize_contractor_name(hpt.contractor)
),
matches as (
  select
    legacy.normalized_name,
    legacy.task_count,
    count(c.id)::integer as match_count,
    bool_or(c.is_active) as has_active_match
  from legacy
  left join public.contractors c
    on c.normalized_name = legacy.normalized_name
   and c.city_id is null
  group by legacy.normalized_name, legacy.task_count
)
select
  count(*) as distinct_legacy_names,
  coalesce(sum(task_count), 0) as affected_tasks,
  count(*) filter (where match_count = 1 and has_active_match) as exact_active_names,
  count(*) filter (where match_count = 1 and not has_active_match) as exact_inactive_names,
  count(*) filter (where match_count = 0) as missing_names,
  count(*) filter (where match_count > 1) as ambiguous_names,
  coalesce(sum(task_count) filter (where match_count = 1 and has_active_match), 0)
    as safely_mappable_tasks
from matches;

-- Safety invariant:
-- backfill must not proceed while either count is non-zero.
with legacy as (
  select distinct public.normalize_contractor_name(hpt.contractor) as normalized_name
  from public.house_plan_tasks hpt
  where hpt.contractor is not null
    and btrim(hpt.contractor) <> ''
    and hpt.contractor_id is null
),
match_counts as (
  select
    legacy.normalized_name,
    count(c.id)::integer as match_count,
    bool_or(c.is_active) as has_active_match
  from legacy
  left join public.contractors c
    on c.normalized_name = legacy.normalized_name
   and c.city_id is null
  group by legacy.normalized_name
)
select
  count(*) filter (where match_count = 0 or not has_active_match) as unresolved_names,
  count(*) filter (where match_count > 1) as ambiguous_names
from match_counts;
