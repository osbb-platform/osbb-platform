create or replace function public.get_public_house_debtor_history(
  p_house_id uuid
)
returns table (
  period_year int,
  period_month int,
  revision int,
  published_at timestamptz,
  snapshot_updated_at timestamptz,
  row_id uuid,
  apartment_id uuid,
  account_number text,
  apartment_label text,
  owner_name text,
  area numeric,
  closing_balance numeric,
  months_in_debt int,
  series_broken boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  with latest_snapshot as (
    select
      snapshot.id,
      snapshot.period_year,
      snapshot.period_month,
      snapshot.revision,
      snapshot.published_at,
      snapshot.updated_at
    from public.house_debtor_month_snapshots snapshot
    where snapshot.house_id = p_house_id
      and snapshot.status = 'published'
    order by
      snapshot.period_year desc,
      snapshot.period_month desc,
      snapshot.revision desc
    limit 1
  )
  select
    snapshot.period_year,
    snapshot.period_month,
    snapshot.revision,
    snapshot.published_at,
    snapshot.updated_at,
    month_row.id,
    month_row.apartment_id,
    month_row.account_number,
    month_row.apartment_label,
    month_row.owner_name,
    month_row.area,
    month_row.closing_balance,
    coalesce(series.months_in_debt, 0),
    coalesce(series.series_broken, false)
  from latest_snapshot snapshot
  join public.house_debtor_month_rows month_row
    on month_row.snapshot_id = snapshot.id
   and month_row.house_id = p_house_id
  left join public.house_debtor_series series
    on series.house_id = p_house_id
   and series.account_number = month_row.account_number
   and series.as_of_year = snapshot.period_year
   and series.as_of_month = snapshot.period_month
  order by
    month_row.apartment_label collate "C",
    month_row.account_number collate "C";
$function$;

revoke all on function
  public.get_public_house_debtor_history(uuid)
from public;

grant execute on function
  public.get_public_house_debtor_history(uuid)
to anon, authenticated;
