-- P10 T8
-- Keep the historical six-argument RPC signature for PostgREST/Supabase
-- compatibility. p_public_items is intentionally retained but ignored.
-- The authoritative publication model is now:
--   house_debtor_month_snapshots
--   house_debtor_month_rows
--   house_debtor_series
--
-- house_debtors_items is intentionally NOT modified or deleted.

create or replace function public.publish_house_debtor_month_snapshot(
  p_house_id uuid,
  p_snapshot_id uuid,
  p_expected_lock_version int,
  p_expected_published_snapshot_ids uuid[],
  p_series jsonb,
  p_public_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.house_debtor_month_snapshots%rowtype;
  v_current_published_ids uuid[];
  v_expected_published_ids uuid[];
begin
  if p_series is null or jsonb_typeof(p_series) <> 'array' then
    raise exception 'P03_INVALID_SERIES';
  end if;

  -- p_public_items remains in the signature only for RPC compatibility.
  -- It must not influence persistence after P10 T8.
  perform p_public_items;

  perform snapshot.id
  from public.house_debtor_month_snapshots snapshot
  where snapshot.house_id = p_house_id
  for update;

  select snapshot.*
  into v_target
  from public.house_debtor_month_snapshots snapshot
  where snapshot.id = p_snapshot_id
    and snapshot.house_id = p_house_id;

  if v_target.id is null then
    raise exception 'P03_NOT_FOUND';
  end if;

  if v_target.status <> 'draft'
     or v_target.lock_version <> p_expected_lock_version then
    raise exception 'P03_STALE';
  end if;

  select coalesce(
    array_agg(snapshot.id order by snapshot.id),
    array[]::uuid[]
  )
  into v_current_published_ids
  from public.house_debtor_month_snapshots snapshot
  where snapshot.house_id = p_house_id
    and snapshot.status = 'published';

  select coalesce(
    array_agg(expected.id order by expected.id),
    array[]::uuid[]
  )
  into v_expected_published_ids
  from unnest(
    coalesce(
      p_expected_published_snapshot_ids,
      array[]::uuid[]
    )
  ) as expected(id);

  if v_current_published_ids <> v_expected_published_ids then
    raise exception 'P03_STALE';
  end if;

  update public.house_debtor_month_snapshots snapshot
  set
    status = 'superseded',
    updated_at = pg_catalog.now(),
    lock_version = snapshot.lock_version + 1
  where snapshot.house_id = p_house_id
    and snapshot.period_year = v_target.period_year
    and snapshot.period_month = v_target.period_month
    and snapshot.status = 'published';

  update public.house_debtor_month_snapshots snapshot
  set
    status = 'published',
    published_at = pg_catalog.now(),
    updated_at = pg_catalog.now(),
    lock_version = snapshot.lock_version + 1
  where snapshot.id = p_snapshot_id
    and snapshot.house_id = p_house_id
    and snapshot.status = 'draft'
    and snapshot.lock_version = p_expected_lock_version;

  if not found then
    raise exception 'P03_STALE';
  end if;

  delete from public.house_debtor_series series
  where series.house_id = p_house_id;

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
    p_house_id,
    btrim(input.item->>'accountNumber'),
    (input.item->>'asOfYear')::int,
    (input.item->>'asOfMonth')::int,
    (input.item->>'monthsInDebt')::int,
    (input.item->>'seriesBroken')::boolean,
    (input.item->>'latestBalance')::numeric,
    pg_catalog.now()
  from jsonb_array_elements(p_series) as input(item);

  return p_snapshot_id;
end;
$$;

revoke all on function public.publish_house_debtor_month_snapshot(
  uuid,
  uuid,
  int,
  uuid[],
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.publish_house_debtor_month_snapshot(
  uuid,
  uuid,
  int,
  uuid[],
  jsonb,
  jsonb
) to service_role;
