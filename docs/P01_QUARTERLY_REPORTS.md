# P01 — Quarterly reports / Period model rollout

## Scope

P01 introduces an explicit period model for house reports.

Supported period kinds:
- none — без періоду
- month — місяць + рік
- quarter — квартал + рік
- year — рік

Legacy database fields remain for transition compatibility:
- period_type
- month
- year

New canonical fields:
- period_kind
- period_month
- period_quarter
- period_year

## Delivered blocks

### T1 — additive schema

Migration:
- supabase/migrations/202607091308_add_house_report_period_model.sql

Adds new period columns, constraints, comments and index.

No destructive SQL.

### T2 — backfill

Migration:
- supabase/migrations/202607091316_backfill_house_report_period_model.sql

Backfill rules:
- valid legacy month + year -> period_kind = month
- valid legacy year only -> period_kind = year
- no automatic quarter inference
- ambiguous rows -> period_kind = none
- ambiguous rows are recorded in public._p01_manual_review

Expected result from development preflight:
- month: 202
- year: 68
- quarter: 0
- none: 105
- _p01_manual_review: 102 rows

### T3 — command normalization

Report command handlers accept the new period union:
- { period: { kind: "none" } }
- { period: { kind: "month", month: 1, year: 2026 } }
- { period: { kind: "quarter", quarter: 1, year: 2026 } }
- { period: { kind: "year", year: 2026 } }

Legacy payload fields remain accepted during transition:
- periodType
- month
- year

Invalid period shapes are rejected before database constraints.

### T4 — admin form

Admin report form now supports:
- Без періоду
- Місяць
- Квартал
- Рік

Conditional fields:
- month -> month + year
- quarter -> quarter + year
- year -> year
- none -> no period value fields

### T5 — services and public filters

Admin/public report services return:
- periodKind
- periodMonth
- periodQuarter
- periodYear

Legacy snapshot fields are derived from the new model:
- periodType
- month
- year

Public filters:
- Усі
- Місяць
- Квартал
- Рік

Reports with period_kind = none are visible only under Усі.

Sorting is application-side:
1. pinned reports first
2. normalized period key descending
3. yearly report uses month key 13, so it sorts after Q4 of the same year
4. reports without period are last unless pinned
5. date/sort/title fallback

No SQL sorting magic was introduced.

### T6 — tests

Added tests for:
- period labels
- sort keys
- public sorting
- available period value lists
- legacy URL fallback
- month/quarter/year filtering
- none only in Усі

Expected test count after T6:
- 4 test files
- 18 tests

## Verification commands

Run:
- npx vitest run
- npm run verify

## Verification SQL after migrations

Run after applying T1+T2 to the target database:

select period_kind, count(*) as reports_count
from public.house_reports
group by period_kind
order by period_kind;

select count(*) as invalid_month_period_count
from public.house_reports
where period_kind = 'month'
  and (period_month is null or period_year is null or period_quarter is not null);

select count(*) as invalid_quarter_period_count
from public.house_reports
where period_kind = 'quarter'
  and (period_quarter is null or period_year is null or period_month is not null);

select count(*) as invalid_year_period_count
from public.house_reports
where period_kind = 'year'
  and (period_year is null or period_month is not null or period_quarter is not null);

select count(*) as invalid_none_period_count
from public.house_reports
where period_kind = 'none'
  and (period_month is not null or period_quarter is not null or period_year is not null);

select count(*) as auto_quarter_count
from public.house_reports
where period_kind = 'quarter';

select reason, count(*) as reports_count
from public._p01_manual_review
group by reason
order by reason;

select *
from public._p01_manual_review
order by recorded_at desc, legacy_year desc nulls last, legacy_month asc nulls last;

Expected from development preflight:
- period_kind=month: 202
- period_kind=year: 68
- period_kind=quarter: 0
- period_kind=none: 105
- _p01_manual_review rows: 102

## Manual smoke checklist

Admin:
1. Create report with Без періоду.
2. Create report with Місяць + Рік.
3. Create report with Квартал + Рік.
4. Create report with Рік.
5. Edit each report and verify selected period is preserved.
6. Publish reports and verify public page.

Public:
1. Усі shows all published reports, including reports without period.
2. Місяць shows only monthly reports.
3. Квартал shows only quarterly reports.
4. Рік shows only yearly reports.
5. Reports without period do not appear in month/quarter/year filters.
6. Pinned reports appear first.
7. Yearly report sorts after Q4 of the same year by normalized period key.

## Deployment notes

Do not apply migrations or deploy without owner approval.

Recommended order after final approval:
1. Apply T1 schema migration.
2. Apply T2 backfill migration.
3. Run verification SQL.
4. Deploy application code.
5. Smoke admin and public reports.
6. Review _p01_manual_review rows.

## Rollback notes

This change is additive:
- legacy columns remain present
- legacy payload fields are still accepted
- new code derives legacy snapshot fields for compatibility

If app rollback is required, the old app can still rely on period_type/month/year.

Database rollback should be handled as forward-fix only.
