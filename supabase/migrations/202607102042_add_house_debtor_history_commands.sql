
create or replace function public.import_house_debtor_month_draft(
  p_house_id uuid,
  p_created_by uuid,
  p_period_year int,
  p_period_month int,
  p_source text,
  p_import_meta jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot_id uuid;
  v_revision int;
  v_duplicate_account text;
  v_unknown_accounts text;
begin
  if p_period_year not between 2000 and 2100
     or p_period_month not between 1 and 12 then
    raise exception 'P03_INVALID_PERIOD';
  end if;

  if p_source not in ('manual_import', 'buffer_1c', 'manual_edit') then
    raise exception 'P03_INVALID_SOURCE';
  end if;

  if p_import_meta is null
     or jsonb_typeof(p_import_meta) <> 'object' then
    raise exception 'P03_INVALID_IMPORT_META';
  end if;

  if p_rows is null
     or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) = 0 then
    raise exception 'P03_INVALID_ROWS';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) as input(item)
    where jsonb_typeof(input.item) <> 'object'
       or coalesce(btrim(input.item->>'accountNumber'), '') = ''
       or jsonb_typeof(input.item->'closingBalance') <> 'number'
       or case
         when jsonb_typeof(input.item->'closingBalance') = 'number'
           then abs((input.item->>'closingBalance')::numeric) >
             9999999999.99
         else false
       end
       or case
         when jsonb_typeof(input.item->'accrued') = 'number'
           then abs((input.item->>'accrued')::numeric) >
             9999999999.99
         else false
       end
       or case
         when jsonb_typeof(input.item->'paid') = 'number'
           then abs((input.item->>'paid')::numeric) >
             9999999999.99
         else false
       end
       or case
         when jsonb_typeof(input.item->'debtSourceValue') = 'number'
           then abs((input.item->>'debtSourceValue')::numeric) >
             9999999999.99
         else false
       end
       or (
         input.item ? 'accrued'
         and input.item->'accrued' <> 'null'::jsonb
         and jsonb_typeof(input.item->'accrued') <> 'number'
       )
       or (
         input.item ? 'paid'
         and input.item->'paid' <> 'null'::jsonb
         and jsonb_typeof(input.item->'paid') <> 'number'
       )
       or (
         input.item ? 'debtSourceValue'
         and input.item->'debtSourceValue' <> 'null'::jsonb
         and jsonb_typeof(input.item->'debtSourceValue') <> 'number'
       )
  ) then
    raise exception 'P03_INVALID_ROWS';
  end if;

  select btrim(input.item->>'accountNumber')
  into v_duplicate_account
  from jsonb_array_elements(p_rows) as input(item)
  group by btrim(input.item->>'accountNumber')
  having count(*) > 1
  order by btrim(input.item->>'accountNumber')
  limit 1;

  if v_duplicate_account is not null then
    raise exception 'P03_DUPLICATE_ACCOUNT:%', v_duplicate_account;
  end if;

  select string_agg(account_number, ', ' order by account_number)
  into v_unknown_accounts
  from (
    select distinct btrim(input.item->>'accountNumber') as account_number
    from jsonb_array_elements(p_rows) as input(item)
    left join public.house_apartments apartment
      on apartment.house_id = p_house_id
     and apartment.archived_at is null
     and btrim(apartment.account_number) =
       btrim(input.item->>'accountNumber')
    where apartment.id is null
    order by account_number
    limit 10
  ) as unknown;

  if v_unknown_accounts is not null then
    raise exception 'P03_UNKNOWN_ACCOUNT:%', v_unknown_accounts;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(
      p_house_id::text || ':' || p_period_year::text || ':' ||
      p_period_month::text
    )
  );

  select coalesce(max(snapshot.revision), 0) + 1
  into v_revision
  from public.house_debtor_month_snapshots snapshot
  where snapshot.house_id = p_house_id
    and snapshot.period_year = p_period_year
    and snapshot.period_month = p_period_month;

  insert into public.house_debtor_month_snapshots (
    house_id,
    period_year,
    period_month,
    revision,
    source,
    import_meta,
    status,
    created_by
  )
  values (
    p_house_id,
    p_period_year,
    p_period_month,
    v_revision,
    p_source,
    p_import_meta,
    'draft',
    p_created_by
  )
  returning id into v_snapshot_id;

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
    v_snapshot_id,
    p_house_id,
    apartment.id,
    btrim(apartment.account_number),
    apartment.apartment_label,
    apartment.owner_name,
    apartment.area,
    case
      when input.item->'accrued' is null
        or input.item->'accrued' = 'null'::jsonb
        then null
      else (input.item->>'accrued')::numeric
    end,
    case
      when input.item->'paid' is null
        or input.item->'paid' = 'null'::jsonb
        then null
      else (input.item->>'paid')::numeric
    end,
    (input.item->>'closingBalance')::numeric,
    case
      when input.item->'debtSourceValue' is null
        or input.item->'debtSourceValue' = 'null'::jsonb
        then null
      else (input.item->>'debtSourceValue')::numeric
    end
  from jsonb_array_elements(p_rows) with ordinality as input(item, row_order)
  join public.house_apartments apartment
    on apartment.house_id = p_house_id
   and apartment.archived_at is null
   and btrim(apartment.account_number) =
     btrim(input.item->>'accountNumber')
  order by input.row_order;

  return v_snapshot_id;
end;
$$;


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

  if p_public_items is null
     or jsonb_typeof(p_public_items) <> 'array' then
    raise exception 'P03_INVALID_PUBLIC_ITEMS';
  end if;

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
    coalesce(p_expected_published_snapshot_ids, array[]::uuid[])
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

  update public.house_debtors_items item
  set
    lifecycle_status = 'archived',
    updated_at = pg_catalog.now()
  where item.house_id = p_house_id
    and item.lifecycle_status = 'published';

  insert into public.house_debtors_items (
    house_id,
    apartment_id,
    apartment_label,
    account_number,
    owner_name,
    area,
    amount,
    days,
    lifecycle_status,
    created_at,
    updated_at
  )
  select
    p_house_id,
    case
      when coalesce(input.item->>'apartmentId', '') = '' then null
      else (input.item->>'apartmentId')::uuid
    end,
    coalesce(input.item->>'apartmentLabel', ''),
    btrim(input.item->>'accountNumber'),
    coalesce(input.item->>'ownerName', ''),
    case
      when input.item->'area' is null
        or input.item->'area' = 'null'::jsonb
        then null
      else (input.item->>'area')::numeric
    end,
    input.item->>'amount',
    input.item->>'days',
    'published',
    pg_catalog.now(),
    pg_catalog.now()
  from jsonb_array_elements(p_public_items) as input(item);

  return p_snapshot_id;
end;
$$;


create or replace function public.discard_house_debtor_month_snapshot(
  p_house_id uuid,
  p_snapshot_id uuid,
  p_expected_lock_version int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.house_debtor_month_snapshots snapshot
  set
    status = 'discarded',
    updated_at = pg_catalog.now(),
    lock_version = snapshot.lock_version + 1
  where snapshot.id = p_snapshot_id
    and snapshot.house_id = p_house_id
    and snapshot.status = 'draft'
    and snapshot.lock_version = p_expected_lock_version;

  if not found then
    raise exception 'P03_STALE';
  end if;

  return p_snapshot_id;
end;
$$;


create or replace function public.relabel_house_debtor_month_snapshot(
  p_house_id uuid,
  p_snapshot_id uuid,
  p_expected_lock_version int,
  p_period_year int,
  p_period_month int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot public.house_debtor_month_snapshots%rowtype;
  v_revision int;
begin
  if p_period_year not between 2000 and 2100
     or p_period_month not between 1 and 12 then
    raise exception 'P03_INVALID_PERIOD';
  end if;

  select snapshot.*
  into v_snapshot
  from public.house_debtor_month_snapshots snapshot
  where snapshot.id = p_snapshot_id
    and snapshot.house_id = p_house_id
  for update;

  if v_snapshot.id is null then
    raise exception 'P03_NOT_FOUND';
  end if;

  if v_snapshot.status <> 'draft'
     or v_snapshot.lock_version <> p_expected_lock_version then
    raise exception 'P03_STALE';
  end if;

  if v_snapshot.period_year = p_period_year
     and v_snapshot.period_month = p_period_month then
    raise exception 'P03_SAME_PERIOD';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(
      p_house_id::text || ':' || p_period_year::text || ':' ||
      p_period_month::text
    )
  );

  select coalesce(max(snapshot.revision), 0) + 1
  into v_revision
  from public.house_debtor_month_snapshots snapshot
  where snapshot.house_id = p_house_id
    and snapshot.period_year = p_period_year
    and snapshot.period_month = p_period_month;

  update public.house_debtor_month_snapshots snapshot
  set
    period_year = p_period_year,
    period_month = p_period_month,
    revision = v_revision,
    updated_at = pg_catalog.now(),
    lock_version = snapshot.lock_version + 1
  where snapshot.id = p_snapshot_id
    and snapshot.house_id = p_house_id
    and snapshot.status = 'draft'
    and snapshot.lock_version = p_expected_lock_version;

  if not found then
    raise exception 'P03_STALE';
  end if;

  return p_snapshot_id;
end;
$$;


revoke all on function public.import_house_debtor_month_draft(
  uuid,
  uuid,
  int,
  int,
  text,
  jsonb,
  jsonb
) from public, authenticated;

revoke all on function public.publish_house_debtor_month_snapshot(
  uuid,
  uuid,
  int,
  uuid[],
  jsonb,
  jsonb
) from public, authenticated;

revoke all on function public.discard_house_debtor_month_snapshot(
  uuid,
  uuid,
  int
) from public, authenticated;

revoke all on function public.relabel_house_debtor_month_snapshot(
  uuid,
  uuid,
  int,
  int,
  int
) from public, authenticated;


grant execute on function public.import_house_debtor_month_draft(
  uuid,
  uuid,
  int,
  int,
  text,
  jsonb,
  jsonb
) to service_role;

grant execute on function public.publish_house_debtor_month_snapshot(
  uuid,
  uuid,
  int,
  uuid[],
  jsonb,
  jsonb
) to service_role;

grant execute on function public.discard_house_debtor_month_snapshot(
  uuid,
  uuid,
  int
) to service_role;

grant execute on function public.relabel_house_debtor_month_snapshot(
  uuid,
  uuid,
  int,
  int,
  int
) to service_role;
