-- Recover confidently classifiable P01 report periods and restore explicit
-- announcement pinning.
--
-- Production preview on 2026-07-10:
-- - 108 manual-review rows total;
-- - 103 reports still had period_kind = 'none';
-- - all 103 were classifiable: 91 month, 4 quarter, 8 year;
-- - 5 review rows were stale because the reports had already been corrected;
-- - 0 unresolved rows.
--
-- Existing announcements are intentionally left unpinned. Historical pin state
-- was not preserved in the legacy data, so deriving it from level = 'danger'
-- would recreate the production bug.

with source_rows as (
  select
    review.report_id,
    review.legacy_month,
    report.title,
    report.report_date,
    report.period_kind,
    regexp_match(
      lower(report.title),
      '([1-4])[[:space:]]*(кв[.]?|квартал)'
    ) as numeric_quarter_match,
    substring(
      report.title
      from '([12][0-9]{3})'
    ) as title_year_text
  from public._p01_manual_review as review
  join public.house_reports as report
    on report.id = review.report_id
  where review.reason = 'legacy_month_without_year'
),
classified as (
  select
    source.*,
    case
      when lower(title) ~ 'кошторис' then 'year'
      when lower(title) ~ 'півріч' then 'year'
      when numeric_quarter_match is not null then 'quarter'
      when legacy_month ~ '^(0[1-9]|1[0-2])$' then 'month'
      else null
    end as target_kind,
    case
      when title_year_text ~ '^[12][0-9]{3}$'
        then title_year_text::integer
      when report_date is not null
       and legacy_month ~ '^(0[1-9]|1[0-2])$'
        then
          extract(year from report_date)::integer
          -
          case
            when extract(month from report_date)::integer
                 < legacy_month::integer
              then 1
            else 0
          end
      else null
    end as target_year,
    case
      when numeric_quarter_match is not null
        then (numeric_quarter_match)[1]::integer
      else null
    end as target_quarter,
    case
      when legacy_month ~ '^(0[1-9]|1[0-2])$'
        then legacy_month::integer
      else null
    end as target_month
  from source_rows as source
),
recovery_plan as (
  select
    classified.*,
    (
      period_kind = 'none'
      and target_kind is not null
      and target_year between 2000 and 2100
      and (
        (
          target_kind = 'month'
          and target_month between 1 and 12
        )
        or (
          target_kind = 'quarter'
          and target_quarter between 1 and 4
        )
        or target_kind = 'year'
      )
    ) as eligible_for_update
  from classified
)
update public.house_reports as report
set
  period_kind = plan.target_kind,
  period_month = case
    when plan.target_kind = 'month' then plan.target_month
    else null
  end,
  period_quarter = case
    when plan.target_kind = 'quarter' then plan.target_quarter
    else null
  end,
  period_year = plan.target_year
from recovery_plan as plan
where report.id = plan.report_id
  and report.period_kind = 'none'
  and plan.eligible_for_update;

delete from public._p01_manual_review as review
using public.house_reports as report
where report.id = review.report_id
  and review.reason = 'legacy_month_without_year'
  and report.period_kind <> 'none';

do $migration_check$
declare
  remaining_review_count integer;
begin
  select count(*)
  into remaining_review_count
  from public._p01_manual_review
  where reason = 'legacy_month_without_year';

  if remaining_review_count <> 0 then
    raise exception
      'P01 report recovery left % manual-review rows',
      remaining_review_count;
  end if;
end;
$migration_check$;

alter table public.house_announcements
  add column if not exists is_pinned boolean not null default false;

comment on column public.house_announcements.is_pinned is
  'True when a published announcement is explicitly pinned as the primary house announcement.';

create or replace function public.enforce_single_published_pinned_house_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.lifecycle_status = 'published'
     and coalesce(new.is_pinned, false)
  then
    update public.house_announcements
    set
      is_pinned = false,
      updated_at = now(),
      lock_version = lock_version + 1
    where house_id = new.house_id
      and id <> new.id
      and lifecycle_status = 'published'
      and is_pinned = true;
  end if;

  return new;
end;
$function$;

revoke all
  on function public.enforce_single_published_pinned_house_announcement()
  from public;

revoke execute
  on function public.enforce_single_published_pinned_house_announcement()
  from anon;

grant execute
  on function public.enforce_single_published_pinned_house_announcement()
  to authenticated;

grant execute
  on function public.enforce_single_published_pinned_house_announcement()
  to service_role;

drop trigger if exists
  enforce_single_published_pinned_house_announcement_insert
  on public.house_announcements;

create trigger enforce_single_published_pinned_house_announcement_insert
before insert
on public.house_announcements
for each row
execute function public.enforce_single_published_pinned_house_announcement();

drop trigger if exists
  enforce_single_published_pinned_house_announcement_update
  on public.house_announcements;

create trigger enforce_single_published_pinned_house_announcement_update
before update of is_pinned, lifecycle_status
on public.house_announcements
for each row
execute function public.enforce_single_published_pinned_house_announcement();

create unique index if not exists
  house_announcements_one_published_pin_per_house_idx
on public.house_announcements (house_id)
where lifecycle_status = 'published'
  and is_pinned = true;
