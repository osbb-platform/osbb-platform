-- Hotfix: recover annual reports misclassified as monthly by the initial P01 backfill.
-- Root cause: legacy annual reports had legacy month/year metadata, so the first P01 backfill
-- classified them as month instead of year.
-- Important: the recovered year is extracted from the report title, not from the old metadata.

do $$
declare
  expected_count integer := 89;
  actual_count integer;
  missing_title_year_count integer;
begin
  with candidates as (
    select
      report.id,
      substring(report.title from '(20[0-9]{2}|19[0-9]{2})')::integer as title_year
    from public.house_reports as report
    where report.period_kind = 'month'
      and report.period_type = 'past'
      and report.period_year between 2000 and 2100
      and report.period_month between 1 and 12
      and (
        lower(report.title) ~ '(^|[[:space:]])річн'
        or lower(report.title) ~ '(^|[[:space:]])годов'
        or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+рік'
        or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+год'
        or lower(report.title) ~ '[12][0-9]{3}[[:space:]]+за[[:space:]]+рік'
        or lower(report.title) ~ 'рух[[:space:]]+грошових[[:space:]]+коштів.*[12][0-9]{3}.*рік'
        or lower(report.title) ~ 'фінансов.*звіт.*[12][0-9]{3}.*рік'
        or lower(report.title) ~ 'акт[[:space:]]+ревізії.*[12][0-9]{3}.*рік'
        or lower(report.title) ~ 'підсумковий.*[12][0-9]{3}.*рік'
      )
  )
  select
    count(*),
    count(*) filter (where title_year is null)
  into actual_count, missing_title_year_count
  from candidates;

  if actual_count <> expected_count then
    raise exception
      'Unexpected annual-report recovery candidate count: expected %, got %',
      expected_count,
      actual_count;
  end if;

  if missing_title_year_count <> 0 then
    raise exception
      'Annual-report recovery has % candidates without title year',
      missing_title_year_count;
  end if;
end;
$$;

create table if not exists public._p01_annual_report_recovery_audit (
  report_id uuid primary key,
  house_id uuid not null,
  title text not null,
  old_period_kind text,
  old_period_type text,
  old_month text,
  old_year integer,
  old_period_month integer,
  old_period_year integer,
  recovered_period_year integer not null,
  recovered_at timestamptz not null default now()
);

alter table public._p01_annual_report_recovery_audit enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = '_p01_annual_report_recovery_audit'
      and policyname = 'p01_annual_report_recovery_audit_admin_select'
  ) then
    execute $policy$
      create policy p01_annual_report_recovery_audit_admin_select
      on public._p01_annual_report_recovery_audit
      for select
      to authenticated
      using (
        public.get_my_admin_role() is not null
        and public.get_my_admin_role() <> 'inactive'
      )
    $policy$;
  end if;
end;
$$;

with candidates as (
  select
    report.id,
    report.house_id,
    report.title,
    report.period_kind,
    report.period_type,
    report.month,
    report.year,
    report.period_month,
    report.period_year,
    substring(report.title from '(20[0-9]{2}|19[0-9]{2})')::integer as title_year
  from public.house_reports as report
  where report.period_kind = 'month'
    and report.period_type = 'past'
    and report.period_year between 2000 and 2100
    and report.period_month between 1 and 12
    and (
      lower(report.title) ~ '(^|[[:space:]])річн'
      or lower(report.title) ~ '(^|[[:space:]])годов'
      or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+рік'
      or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+год'
      or lower(report.title) ~ '[12][0-9]{3}[[:space:]]+за[[:space:]]+рік'
      or lower(report.title) ~ 'рух[[:space:]]+грошових[[:space:]]+коштів.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'фінансов.*звіт.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'акт[[:space:]]+ревізії.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'підсумковий.*[12][0-9]{3}.*рік'
    )
)
insert into public._p01_annual_report_recovery_audit (
  report_id,
  house_id,
  title,
  old_period_kind,
  old_period_type,
  old_month,
  old_year,
  old_period_month,
  old_period_year,
  recovered_period_year
)
select
  id,
  house_id,
  title,
  period_kind,
  period_type,
  month,
  year,
  period_month,
  period_year,
  title_year
from candidates
on conflict (report_id) do nothing;

with candidates as (
  select
    report.id,
    substring(report.title from '(20[0-9]{2}|19[0-9]{2})')::integer as title_year
  from public.house_reports as report
  where report.period_kind = 'month'
    and report.period_type = 'past'
    and report.period_year between 2000 and 2100
    and report.period_month between 1 and 12
    and (
      lower(report.title) ~ '(^|[[:space:]])річн'
      or lower(report.title) ~ '(^|[[:space:]])годов'
      or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+рік'
      or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+год'
      or lower(report.title) ~ '[12][0-9]{3}[[:space:]]+за[[:space:]]+рік'
      or lower(report.title) ~ 'рух[[:space:]]+грошових[[:space:]]+коштів.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'фінансов.*звіт.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'акт[[:space:]]+ревізії.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'підсумковий.*[12][0-9]{3}.*рік'
    )
)
update public.house_reports as report
set
  period_kind = 'year',
  period_month = null,
  period_quarter = null,
  period_year = candidates.title_year,
  period_type = 'past',
  month = null,
  year = candidates.title_year,
  updated_at = now()
from candidates
where report.id = candidates.id;

do $$
declare
  remaining_count integer;
begin
  select count(*)
    into remaining_count
  from public.house_reports as report
  where report.period_kind = 'month'
    and report.period_type = 'past'
    and report.period_year between 2000 and 2100
    and report.period_month between 1 and 12
    and (
      lower(report.title) ~ '(^|[[:space:]])річн'
      or lower(report.title) ~ '(^|[[:space:]])годов'
      or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+рік'
      or lower(report.title) ~ 'за[[:space:]]+[12][0-9]{3}[[:space:]]+год'
      or lower(report.title) ~ '[12][0-9]{3}[[:space:]]+за[[:space:]]+рік'
      or lower(report.title) ~ 'рух[[:space:]]+грошових[[:space:]]+коштів.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'фінансов.*звіт.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'акт[[:space:]]+ревізії.*[12][0-9]{3}.*рік'
      or lower(report.title) ~ 'підсумковий.*[12][0-9]{3}.*рік'
    );

  if remaining_count <> 0 then
    raise exception
      'Annual report recovery left % misclassified rows',
      remaining_count;
  end if;
end;
$$;
