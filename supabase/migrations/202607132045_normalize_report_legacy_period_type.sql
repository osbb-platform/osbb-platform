-- Hotfix: keep deprecated house_reports.period_type compatible with the new P01 period model.
-- Canonical fields are period_kind/period_month/period_quarter/period_year.
-- Legacy period_type is chronological: current/future year -> current, previous years -> past.

do $$
declare
  current_year integer := extract(year from now())::integer;
  normalized_to_current integer := 0;
  normalized_to_past integer := 0;
begin
  update public.house_reports
  set
    period_type = 'current',
    updated_at = now()
  where period_kind in ('month', 'quarter', 'year')
    and period_year is not null
    and period_year >= current_year
    and period_type <> 'current';

  get diagnostics normalized_to_current = row_count;

  update public.house_reports
  set
    period_type = 'past',
    updated_at = now()
  where period_kind in ('month', 'quarter', 'year')
    and period_year is not null
    and period_year < current_year
    and period_type <> 'past';

  get diagnostics normalized_to_past = row_count;

  raise notice
    'normalized report legacy period_type: current=%, past=%',
    normalized_to_current,
    normalized_to_past;
end;
$$;
