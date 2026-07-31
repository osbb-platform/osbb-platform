do $preflight$
declare
  v_unparseable_count bigint;
begin
  select count(*)
  into v_unparseable_count
  from public.house_debtors_items item
  where item.lifecycle_status = 'published'
    and replace(
      replace(
        regexp_replace(
          btrim(item.amount),
          '[[:space:]]',
          '',
          'g'
        ),
        ',',
        '.'
      ),
      '+',
      ''
    ) !~ '^-?[0-9]+([.][0-9]+)?$';

  if v_unparseable_count > 0 then
    raise exception
      'P03_LEGACY_UNPARSEABLE_AMOUNT:%',
      v_unparseable_count;
  end if;
end
$preflight$;


with legacy_houses as (
  select
    item.house_id,
    min(item.created_at) as created_at,
    max(item.updated_at) as published_at,
    count(*) as rows_count
  from public.house_debtors_items item
  where item.lifecycle_status = 'published'
  group by item.house_id
),
inserted_snapshots as (
  insert into public.house_debtor_month_snapshots (
    house_id,
    period_year,
    period_month,
    revision,
    source,
    import_meta,
    status,
    published_at,
    created_by,
    created_at,
    updated_at,
    lock_version
  )
  select
    legacy.house_id,
    2026,
    6,
    1,
    'migration_legacy',
    jsonb_build_object(
      'confirmedPeriod',
      '2026-06',
      'confirmedBy',
      'house_manager',
      'legacyPublishedRows',
      legacy.rows_count,
      'migration',
      'P03.T4'
    ),
    'published',
    coalesce(legacy.published_at, pg_catalog.now()),
    null,
    coalesce(legacy.created_at, pg_catalog.now()),
    coalesce(legacy.published_at, pg_catalog.now()),
    1
  from legacy_houses legacy
  where not exists (
    select 1
    from public.house_debtor_month_snapshots snapshot
    where snapshot.house_id = legacy.house_id
      and snapshot.period_year = 2026
      and snapshot.period_month = 6
  )
  returning id, house_id
),
parsed_legacy_rows as (
  select
    item.id,
    item.house_id,
    item.apartment_id,
    btrim(item.account_number) as account_number,
    item.apartment_label,
    item.owner_name,
    item.area,
    replace(
      replace(
        regexp_replace(
          btrim(item.amount),
          '[[:space:]]',
          '',
          'g'
        ),
        ',',
        '.'
      ),
      '+',
      ''
    )::numeric as closing_balance
  from public.house_debtors_items item
  where item.lifecycle_status = 'published'
),
inserted_rows as (
  insert into public.house_debtor_month_rows (
    snapshot_id,
    house_id,
    apartment_id,
    account_number,
    apartment_label,
    owner_name,
    area,
    accrued,
    paid,
    closing_balance,
    debt_source_value
  )
  select
    snapshot.id,
    legacy.house_id,
    legacy.apartment_id,
    legacy.account_number,
    legacy.apartment_label,
    legacy.owner_name,
    legacy.area,
    null,
    null,
    legacy.closing_balance,
    null
  from inserted_snapshots snapshot
  join parsed_legacy_rows legacy
    on legacy.house_id = snapshot.house_id
  returning
    snapshot_id,
    house_id,
    account_number,
    closing_balance
)
insert into public.house_debtor_series (
  house_id,
  account_number,
  as_of_year,
  as_of_month,
  months_in_debt,
  series_broken,
  latest_balance,
  computed_at
)
select
  month_row.house_id,
  month_row.account_number,
  2026,
  6,
  case
    when month_row.closing_balance <= -500 then 1
    else 0
  end,
  false,
  month_row.closing_balance,
  pg_catalog.now()
from inserted_rows month_row;
