-- P01.T1 — Additive period model for house_reports.
-- No semantic backfill here. Existing legacy period_type/month/year columns stay for compatibility.

alter table public.house_reports
  add column if not exists period_kind text not null default 'none',
  add column if not exists period_month integer null,
  add column if not exists period_quarter integer null,
  add column if not exists period_year integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_reports'::regclass
      and conname = 'house_reports_period_kind_check'
  ) then
    alter table public.house_reports
      add constraint house_reports_period_kind_check
      check (period_kind in ('none', 'month', 'quarter', 'year'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_reports'::regclass
      and conname = 'house_reports_period_month_check'
  ) then
    alter table public.house_reports
      add constraint house_reports_period_month_check
      check (period_month is null or period_month between 1 and 12);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_reports'::regclass
      and conname = 'house_reports_period_quarter_check'
  ) then
    alter table public.house_reports
      add constraint house_reports_period_quarter_check
      check (period_quarter is null or period_quarter between 1 and 4);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_reports'::regclass
      and conname = 'house_reports_period_year_check'
  ) then
    alter table public.house_reports
      add constraint house_reports_period_year_check
      check (period_year is null or period_year between 2000 and 2100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.house_reports'::regclass
      and conname = 'house_reports_period_shape'
  ) then
    alter table public.house_reports
      add constraint house_reports_period_shape
      check (
        (
          period_kind = 'none'
          and period_month is null
          and period_quarter is null
          and period_year is null
        )
        or (
          period_kind = 'month'
          and period_month is not null
          and period_quarter is null
          and period_year is not null
        )
        or (
          period_kind = 'quarter'
          and period_quarter is not null
          and period_month is null
          and period_year is not null
        )
        or (
          period_kind = 'year'
          and period_year is not null
          and period_month is null
          and period_quarter is null
        )
      );
  end if;
end $$;

create index if not exists house_reports_period_model_idx
  on public.house_reports (
    house_id,
    period_kind,
    period_year desc,
    period_quarter,
    period_month
  );

comment on column public.house_reports.period_kind is
  'P01 period model: none/month/quarter/year. New code reads this field after P01.T5.';

comment on column public.house_reports.period_month is
  'P01 period model: month number 1..12, only when period_kind=month.';

comment on column public.house_reports.period_quarter is
  'P01 period model: quarter number 1..4, only when period_kind=quarter.';

comment on column public.house_reports.period_year is
  'P01 period model: year 2000..2100, required for month/quarter/year periods.';

comment on column public.house_reports.period_type is
  'Deprecated P01 legacy field: current/past kept for compatibility and rollback. New code must use period_kind.';

comment on column public.house_reports.month is
  'Deprecated P01 legacy field: text month kept for compatibility/backfill. New code must use period_month.';

comment on column public.house_reports.year is
  'Deprecated P01 legacy field: legacy year kept for compatibility/backfill. New code must use period_year.';
