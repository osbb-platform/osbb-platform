-- P04 final remediation: make snapshot creation/recovery and import-buffer
-- completion one transaction. Forward-only; do not apply outside an approved
-- release. The RPC is intentionally service-role only: the content-engine
-- command performs the user/house authorization before calling it.

-- The original SET NULL action contradicts import_buffer_row_match_check
-- (matched rows require a non-null apartment id), so even a full house cascade
-- can fail halfway through constraint processing. A deferred NO ACTION keeps a
-- referenced apartment protected while allowing the same transaction to
-- remove the owning upload rows as part of an approved house cascade.
alter table public.import_buffer_rows
  drop constraint if exists import_buffer_rows_matched_apartment_id_fkey;

alter table public.import_buffer_rows
  add constraint import_buffer_rows_matched_apartment_id_fkey
  foreign key (matched_apartment_id)
  references public.house_apartments(id)
  on delete no action
  deferrable initially deferred;

create or replace function public.normalize_debtors_1c_account_number(
  p_value text
)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  with normalized as (
    select pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(
        pg_catalog.btrim(p_value),
        '^(л/с\s*№?|особ\.\s*рахунок\s*№?|особовий\s*рахунок\s*№?)\s*',
        '',
        'i'
      ),
      '[№[:space:]]',
      '',
      'g'
    ) as value
  )
  select case when value ~ '^[0-9]+$' then value else null end
  from normalized;
$$;

revoke all on function public.normalize_debtors_1c_account_number(text)
  from public, anon, authenticated;

create or replace function public.transfer_house_debtor_import_buffer_atomic(
  p_upload_id uuid,
  p_house_id uuid,
  p_created_by uuid,
  p_expected_lock_version int,
  p_accept_partial boolean,
  p_import_meta jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upload public.import_buffer_uploads%rowtype;
  v_snapshot public.house_debtor_month_snapshots%rowtype;
  v_snapshot_id uuid;
  v_created boolean := false;
  v_source_rows int;
  v_registry_rows int;
  v_classified_rows int;
  v_technical_rows int;
  v_data_rows int;
  v_matched_rows int;
  v_unmatched_rows int;
  v_missing_debt_rows int;
  v_transferable_rows int;
  v_persisted_rows int;
  v_lock_version int;
  v_rows jsonb;
  v_counters jsonb;
  v_import_meta jsonb;
  v_actor_name text;
  v_actor_email text;
  v_actor_role text;
begin
  if p_upload_id is null
     or p_house_id is null
     or p_created_by is null
     or p_expected_lock_version is null
     or p_accept_partial is null
     or p_import_meta is null
     or jsonb_typeof(p_import_meta) <> 'object' then
    raise exception 'P04_INVALID_ATOMIC_TRANSFER_INPUT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('p04-import-buffer:' || p_upload_id::text)
  );

  select upload.*
  into v_upload
  from public.import_buffer_uploads as upload
  where upload.id = p_upload_id
    and upload.house_id = p_house_id
    and upload.adapter_key = 'debtors_1c'
  for update;

  if v_upload.id is null then
    raise exception 'P04_UPLOAD_NOT_FOUND';
  end if;

  if v_upload.confirmed_period_year is null
     or v_upload.confirmed_period_month is null then
    raise exception 'P04_CONFIRMED_PERIOD_REQUIRED';
  end if;

  -- A lost response after COMMIT must be recoverable without trusting mutable
  -- staging rows. The completed upload points to the immutable snapshot.
  if v_upload.status = 'transferred' then
    begin
      v_snapshot_id := nullif(v_upload.stats->>'snapshotId', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'P04_TRANSFERRED_SNAPSHOT_INVALID';
    end;

    if v_snapshot_id is null then
      select snapshot.id
      into v_snapshot_id
      from public.house_debtor_month_snapshots as snapshot
      where snapshot.house_id = p_house_id
        and snapshot.source = 'buffer_1c'
        and snapshot.import_meta->>'importBufferUploadId' = p_upload_id::text
      order by snapshot.created_at, snapshot.id
      limit 1;
    end if;

    select snapshot.*
    into v_snapshot
    from public.house_debtor_month_snapshots as snapshot
    where snapshot.id = v_snapshot_id
      and snapshot.house_id = p_house_id
      and snapshot.source = 'buffer_1c'
      and snapshot.period_year = v_upload.confirmed_period_year
      and snapshot.period_month = v_upload.confirmed_period_month
      and snapshot.import_meta->>'importBufferUploadId' = p_upload_id::text;

    if v_snapshot.id is null then
      raise exception 'P04_TRANSFERRED_SNAPSHOT_MISMATCH';
    end if;

    select count(*)::int
    into v_persisted_rows
    from public.house_debtor_month_rows as row
    where row.snapshot_id = v_snapshot_id
      and row.house_id = p_house_id;

    if jsonb_typeof(v_upload.stats->'counters') <> 'object'
       or (v_upload.stats->'counters'->>'persistedRows') !~ '^[0-9]+$'
       or (v_upload.stats->'counters'->>'persistedRows')::int <> v_persisted_rows then
      raise exception 'P04_TRANSFERRED_COUNT_MISMATCH';
    end if;

    insert into public.house_content_history (
      actor_admin_id,
      actor_name,
      actor_email,
      actor_role,
      house_id,
      entity_type,
      entity_id,
      action,
      description,
      after_snapshot,
      metadata
    )
    select
      p_created_by,
      coalesce(profile.full_name, profile.email, 'Адміністратор'),
      profile.email,
      null,
      p_house_id,
      'house_debtor_month_snapshot',
      v_snapshot_id,
      'debtors.month_imported',
      'Створено чернетку місячного знімка боргів.',
      jsonb_build_object(
        'snapshotId', v_snapshot_id,
        'periodYear', v_snapshot.period_year,
        'periodMonth', v_snapshot.period_month,
        'revision', v_snapshot.revision,
        'status', v_snapshot.status
      ),
      jsonb_build_object(
        'importBufferUploadId', p_upload_id,
        'counters', v_upload.stats->'counters',
        'recovered', true
      )
    from public.profiles as profile
    where profile.id = p_created_by
      and not exists (
        select 1
        from public.house_content_history as history
        where history.entity_type = 'house_debtor_month_snapshot'
          and history.entity_id = v_snapshot_id
          and history.action = 'debtors.month_imported'
      );

    return jsonb_build_object(
      'snapshotId', v_snapshot_id,
      'persistedRows', v_persisted_rows,
      'lockVersion', v_upload.lock_version,
      'created', false,
      'recovered', true,
      'counters', v_upload.stats->'counters'
    );
  end if;

  if v_upload.status <> 'confirmed'
     or v_upload.lock_version <> p_expected_lock_version then
    raise exception 'P04_STALE';
  end if;

  if jsonb_typeof(v_upload.stats->'counters') <> 'object'
     or (v_upload.stats->'counters'->>'sourceRows') !~ '^[0-9]+$' then
    raise exception 'P04_COUNTERS_MISSING';
  end if;

  v_source_rows := (v_upload.stats->'counters'->>'sourceRows')::int;

  -- Keep an approved house deletion behind this transfer, then prevent every
  -- apartment insert/update/delete while the registry is reconciled and the
  -- snapshot is written. Row locks alone do not protect against a concurrent
  -- insert that was absent from the initial SELECT.
  perform house.id
  from public.houses as house
  where house.id = p_house_id
  for key share;

  if not found then
    raise exception 'P04_HOUSE_NOT_FOUND';
  end if;

  lock table public.house_apartments in share mode;

  perform apartment.id
  from public.house_apartments as apartment
  where apartment.house_id = p_house_id
    and apartment.archived_at is null
  for share;

  select count(*)::int
  into v_registry_rows
  from public.house_apartments as apartment
  where apartment.house_id = p_house_id
    and apartment.archived_at is null;

  perform row.id
  from public.import_buffer_rows as row
  where row.upload_id = p_upload_id
  order by row.row_index
  for update;

  select
    count(*)::int,
    count(*) filter (where row.classification <> 'data')::int,
    count(*) filter (where row.classification = 'data')::int,
    count(*) filter (
      where row.classification = 'data'
        and row.match_status = 'matched'
    )::int,
    count(*) filter (
      where row.classification = 'data'
        and row.match_status = 'unmatched'
    )::int,
    count(*) filter (
      where row.classification = 'data'
        and row.match_status = 'matched'
        and row.debt_value is null
    )::int,
    count(*) filter (
      where row.classification = 'data'
        and row.match_status = 'matched'
        and row.debt_value is not null
    )::int
  into
    v_classified_rows,
    v_technical_rows,
    v_data_rows,
    v_matched_rows,
    v_unmatched_rows,
    v_missing_debt_rows,
    v_transferable_rows
  from public.import_buffer_rows as row
  where row.upload_id = p_upload_id;

  if v_classified_rows = 0 or v_transferable_rows = 0 then
    raise exception 'P04_NO_TRANSFERABLE_ROWS';
  end if;

  if v_source_rows < v_classified_rows then
    raise exception 'P04_SOURCE_COUNT_MISMATCH';
  end if;

  if v_missing_debt_rows > 0 then
    raise exception 'P04_MISSING_DEBT:%', v_missing_debt_rows;
  end if;

  if v_unmatched_rows > 0 and not p_accept_partial then
    raise exception 'P04_PARTIAL_CONFIRMATION_REQUIRED:%', v_unmatched_rows;
  end if;

  if exists (
    select normalized.account_number
    from (
      select public.normalize_debtors_1c_account_number(
        apartment.account_number
      ) as account_number
      from public.house_apartments as apartment
      where apartment.house_id = p_house_id
        and apartment.archived_at is null
    ) as normalized
    where normalized.account_number is not null
    group by normalized.account_number
    having count(*) > 1
  ) then
    raise exception 'P04_DUPLICATE_REGISTRY_ACCOUNT';
  end if;

  if exists (
    select 1
    from public.import_buffer_rows as row
    where row.upload_id = p_upload_id
      and row.classification = 'data'
      and row.match_status = 'matched'
      and (
        row.matched_apartment_id is null
        or nullif(pg_catalog.btrim(row.account_number_normalized), '') is null
      )
  ) then
    raise exception 'P04_INVALID_MATCHED_ROW';
  end if;

  if exists (
    select row.matched_apartment_id
    from public.import_buffer_rows as row
    where row.upload_id = p_upload_id
      and row.classification = 'data'
      and row.match_status = 'matched'
    group by row.matched_apartment_id
    having count(*) > 1
  ) then
    raise exception 'P04_DUPLICATE_MATCHED_APARTMENT';
  end if;

  if exists (
    select 1
    from public.import_buffer_rows as row
    left join public.house_apartments as apartment
      on apartment.id = row.matched_apartment_id
     and apartment.house_id = p_house_id
     and apartment.archived_at is null
    where row.upload_id = p_upload_id
      and row.classification = 'data'
      and row.match_status = 'matched'
      and (
        apartment.id is null
        or public.normalize_debtors_1c_account_number(apartment.account_number)
          is distinct from row.account_number_normalized
      )
  ) then
    raise exception 'P04_REGISTRY_MAPPING_CHANGED';
  end if;

  if exists (
    select 1
    from public.import_buffer_rows as row
    join public.house_apartments as apartment
      on apartment.house_id = p_house_id
     and apartment.archived_at is null
     and public.normalize_debtors_1c_account_number(apartment.account_number)
       = row.account_number_normalized
    where row.upload_id = p_upload_id
      and row.classification = 'data'
      and row.match_status = 'unmatched'
  ) then
    raise exception 'P04_REGISTRY_MAPPING_CHANGED';
  end if;

  v_counters := jsonb_build_object(
    'sourceRows', v_source_rows,
    'registryRows', v_registry_rows,
    'classifiedRows', v_classified_rows,
    'unclassifiedRows', v_source_rows - v_classified_rows,
    'technicalExcludedRows', v_technical_rows,
    'dataRows', v_data_rows,
    'matchedRows', v_matched_rows,
    'unmatchedRows', v_unmatched_rows,
    'missingDebtRows', v_missing_debt_rows,
    'transferableRows', v_transferable_rows,
    'persistedRows', null
  );

  if (v_upload.stats->'counters') - 'persistedRows'
       <> v_counters - 'persistedRows' then
    raise exception 'P04_STAGED_COUNTERS_CHANGED';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'accountNumber', pg_catalog.btrim(apartment.account_number),
      'accrued', row.accrued,
      'paid', row.paid,
      'closingBalance', -row.debt_value,
      'debtSourceValue', row.debt_value
    )
    order by row.row_index
  )
  into v_rows
  from public.import_buffer_rows as row
  join public.house_apartments as apartment
    on apartment.id = row.matched_apartment_id
   and apartment.house_id = p_house_id
   and apartment.archived_at is null
  where row.upload_id = p_upload_id
    and row.classification = 'data'
    and row.match_status = 'matched'
    and row.debt_value is not null;

  v_import_meta := p_import_meta || jsonb_build_object(
    'importBufferUploadId', p_upload_id,
    'adapterKey', 'debtors_1c',
    'confirmedPeriod', jsonb_build_object(
      'year', v_upload.confirmed_period_year,
      'month', v_upload.confirmed_period_month
    ),
    'counters', v_counters
  );

  select snapshot.*
  into v_snapshot
  from public.house_debtor_month_snapshots as snapshot
  where snapshot.source = 'buffer_1c'
    and snapshot.import_meta->>'importBufferUploadId' = p_upload_id::text
  order by snapshot.created_at, snapshot.id
  limit 1;

  if v_snapshot.id is null then
    v_snapshot_id := public.import_house_debtor_month_draft(
      p_house_id,
      p_created_by,
      v_upload.confirmed_period_year,
      v_upload.confirmed_period_month,
      'buffer_1c',
      v_import_meta,
      v_rows
    );
    v_created := true;
  else
    v_snapshot_id := v_snapshot.id;

    if v_snapshot.house_id <> p_house_id
       or v_snapshot.period_year <> v_upload.confirmed_period_year
       or v_snapshot.period_month <> v_upload.confirmed_period_month then
      raise exception 'P04_EXISTING_SNAPSHOT_MISMATCH';
    end if;

    if (
      select jsonb_agg(
        jsonb_build_object(
          'accountNumber', row.account_number,
          'accrued', row.accrued,
          'paid', row.paid,
          'closingBalance', row.closing_balance,
          'debtSourceValue', row.debt_source_value
        )
        order by row.account_number, row.id
      )
      from public.house_debtor_month_rows as row
      where row.snapshot_id = v_snapshot_id
        and row.house_id = p_house_id
    ) is distinct from (
      select jsonb_agg(item order by item->>'accountNumber')
      from jsonb_array_elements(v_rows) as input(item)
    ) then
      raise exception 'P04_EXISTING_SNAPSHOT_ROWS_MISMATCH';
    end if;
  end if;

  select count(*)::int
  into v_persisted_rows
  from public.house_debtor_month_rows as row
  where row.snapshot_id = v_snapshot_id
    and row.house_id = p_house_id;

  if v_persisted_rows <> v_transferable_rows then
    raise exception 'P04_PERSISTED_COUNT_MISMATCH';
  end if;

  v_counters := jsonb_set(
    v_counters,
    '{persistedRows}',
    to_jsonb(v_persisted_rows),
    true
  );

  update public.import_buffer_uploads
  set
    status = 'transferred',
    error = null,
    stats = v_upload.stats || jsonb_build_object(
      'snapshotId', v_snapshot_id,
      'counters', v_counters
    )
  where id = p_upload_id
    and house_id = p_house_id
    and status = 'confirmed'
    and lock_version = p_expected_lock_version
  returning lock_version into v_lock_version;

  if v_lock_version is null then
    raise exception 'P04_STALE';
  end if;

  select profile.full_name, profile.email
  into v_actor_name, v_actor_email
  from public.profiles as profile
  where profile.id = p_created_by;

  select membership.role::text
  into v_actor_role
  from public.admin_memberships as membership
  where membership.user_id = p_created_by
    and membership.is_active = true
    and membership.status = 'active'
    and (membership.house_id = p_house_id or membership.house_id is null)
  order by (membership.house_id = p_house_id) desc, membership.created_at
  limit 1;

  insert into public.house_content_history (
    actor_admin_id,
    actor_name,
    actor_email,
    actor_role,
    house_id,
    entity_type,
    entity_id,
    action,
    description,
    after_snapshot,
    metadata
  )
  select
    p_created_by,
    coalesce(v_actor_name, v_actor_email, 'Адміністратор'),
    v_actor_email,
    v_actor_role,
    p_house_id,
    'house_debtor_month_snapshot',
    v_snapshot_id,
    'debtors.month_imported',
    'Створено чернетку місячного знімка боргів.',
    jsonb_build_object(
      'snapshotId', snapshot.id,
      'periodYear', snapshot.period_year,
      'periodMonth', snapshot.period_month,
      'revision', snapshot.revision,
      'status', snapshot.status
    ),
    jsonb_build_object(
      'importBufferUploadId', p_upload_id,
      'counters', v_counters,
      'recovered', not v_created
    )
  from public.house_debtor_month_snapshots as snapshot
  where snapshot.id = v_snapshot_id
    and not exists (
      select 1
      from public.house_content_history as history
      where history.entity_type = 'house_debtor_month_snapshot'
        and history.entity_id = v_snapshot_id
        and history.action = 'debtors.month_imported'
    );

  return jsonb_build_object(
    'snapshotId', v_snapshot_id,
    'persistedRows', v_persisted_rows,
    'lockVersion', v_lock_version,
    'created', v_created,
    'recovered', not v_created,
    'counters', v_counters
  );
end;
$$;

-- The older idempotent wrapper was SECURITY DEFINER but inadvertently granted
-- to authenticated. Keep it available only to trusted server code during a
-- rolling release.
revoke all on function public.import_house_debtor_month_draft_idempotent(
  uuid,
  uuid,
  int,
  int,
  text,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.import_house_debtor_month_draft_idempotent(
  uuid,
  uuid,
  int,
  int,
  text,
  jsonb,
  jsonb
) to service_role;

revoke all on function public.transfer_house_debtor_import_buffer_atomic(
  uuid,
  uuid,
  uuid,
  int,
  boolean,
  jsonb
) from public, anon, authenticated;

grant execute on function public.transfer_house_debtor_import_buffer_atomic(
  uuid,
  uuid,
  uuid,
  int,
  boolean,
  jsonb
) to service_role;

comment on function public.transfer_house_debtor_import_buffer_atomic(
  uuid,
  uuid,
  uuid,
  int,
  boolean,
  jsonb
) is
  'P04 atomic, idempotent service-role transfer: validated staging -> P03 draft -> completed upload -> audit history.';
