-- P01.T2 — Backfill additive period model for house_reports.
--
-- Production preflight observed on 2026-07-09:
-- - month format: two-digit numeric strings ('01'..'12')
-- - month + year: 202 reports -> period_kind='month'
-- - month is null + year: 68 reports -> period_kind='year'
-- - month is not null + year is null: 102 reports -> keep period_kind='none' + manual review
-- - month is null + year is null: 3 reports -> keep period_kind='none'
--
-- This migration is intentionally idempotent:
-- - rows already classified away from period_kind='none' are not changed;
-- - ambiguous rows stay none and are inserted into _p01_manual_review once;
-- - no quarter is assigned automatically.

create table if not exists public._p01_manual_review (
  report_id uuid primary key,
  house_id uuid not null,
  legacy_period_type text null,
  legacy_month text null,
  legacy_year integer null,
  reason text not null,
  recorded_at timestamptz not null default now()
);

alter table public._p01_manual_review enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = '_p01_manual_review'
      and policyname = 'p01_manual_review_admin_select'
  ) then
    execute $policy$
      create policy p01_manual_review_admin_select
        on public._p01_manual_review
        for select
        to authenticated
        using (
          public.get_my_admin_role() is not null
          and public.get_my_admin_role() <> 'inactive'
        )
    $policy$;
  end if;
end $$;

create index if not exists p01_manual_review_house_id_idx
  on public._p01_manual_review (house_id);

comment on table public._p01_manual_review is
  'P01 temporary/manual-review report for ambiguous legacy house_reports period backfill rows.';

comment on column public._p01_manual_review.reason is
  'Reason why the legacy period fields could not be safely mapped to the new period model.';

with month_map(legacy_month, mapped_month) as (
  values
    ('01', 1),
    ('02', 2),
    ('03', 3),
    ('04', 4),
    ('05', 5),
    ('06', 6),
    ('07', 7),
    ('08', 8),
    ('09', 9),
    ('10', 10),
    ('11', 11),
    ('12', 12)
)
insert into public._p01_manual_review (
  report_id,
  house_id,
  legacy_period_type,
  legacy_month,
  legacy_year,
  reason
)
select
  report.id,
  report.house_id,
  report.period_type,
  report.month,
  report.year,
  case
    when report.month is not null and report.year is null then 'legacy_month_without_year'
    when report.year is not null and (report.year < 2000 or report.year > 2100) then 'legacy_year_out_of_supported_range'
    when report.month is not null and month_map.mapped_month is null then 'legacy_month_unrecognized'
    else 'legacy_period_unclassified'
  end as reason
from public.house_reports as report
left join month_map
  on month_map.legacy_month = report.month
where report.period_kind = 'none'
  and (
    (report.month is not null and report.year is null)
    or (report.year is not null and (report.year < 2000 or report.year > 2100))
    or (report.month is not null and report.year is not null and month_map.mapped_month is null)
  )
on conflict (report_id) do nothing;

with month_map(legacy_month, mapped_month) as (
  values
    ('01', 1),
    ('02', 2),
    ('03', 3),
    ('04', 4),
    ('05', 5),
    ('06', 6),
    ('07', 7),
    ('08', 8),
    ('09', 9),
    ('10', 10),
    ('11', 11),
    ('12', 12)
)
update public.house_reports as report
set
  period_kind = 'month',
  period_month = month_map.mapped_month,
  period_quarter = null,
  period_year = report.year
from month_map
where report.period_kind = 'none'
  and report.month = month_map.legacy_month
  and report.year between 2000 and 2100;

update public.house_reports as report
set
  period_kind = 'year',
  period_month = null,
  period_quarter = null,
  period_year = report.year
where report.period_kind = 'none'
  and report.month is null
  and report.year between 2000 and 2100;

do $$
declare
  month_count integer;
  year_count integer;
  quarter_count integer;
  none_count integer;
  review_count integer;
begin
  select count(*) into month_count
  from public.house_reports
  where period_kind = 'month';

  select count(*) into year_count
  from public.house_reports
  where period_kind = 'year';

  select count(*) into quarter_count
  from public.house_reports
  where period_kind = 'quarter';

  select count(*) into none_count
  from public.house_reports
  where period_kind = 'none';

  select count(*) into review_count
  from public._p01_manual_review;

  raise notice 'P01.T2 backfill result: month=%, year=%, quarter=%, none=%, manual_review=%',
    month_count,
    year_count,
    quarter_count,
    none_count,
    review_count;
end $$;
