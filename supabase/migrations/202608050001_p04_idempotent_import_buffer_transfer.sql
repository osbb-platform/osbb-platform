-- P04 final reliability — one monthly snapshot per import-buffer upload.
--
-- This migration does not remove or rewrite existing history. It prevents a
-- duplicated/retried transfer of the same upload from creating another
-- revision.

do $$
begin
  if exists (
    select 1
    from public.house_debtor_month_snapshots snapshot
    where snapshot.source = 'buffer_1c'
      and nullif(
        btrim(snapshot.import_meta->>'importBufferUploadId'),
        ''
      ) is not null
    group by snapshot.import_meta->>'importBufferUploadId'
    having count(*) > 1
  ) then
    raise exception
      'P04_DUPLICATE_IMPORT_BUFFER_SNAPSHOT_PRECHECK';
  end if;
end
$$;

create unique index if not exists
  house_debtor_month_snapshots_buffer_upload_uq
on public.house_debtor_month_snapshots (
  (import_meta->>'importBufferUploadId')
)
where source = 'buffer_1c'
  and nullif(
    btrim(import_meta->>'importBufferUploadId'),
    ''
  ) is not null;

create or replace function
  public.import_house_debtor_month_draft_idempotent(
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
  v_upload_id text;
  v_existing_snapshot_id uuid;
begin
  v_upload_id := nullif(
    btrim(p_import_meta->>'importBufferUploadId'),
    ''
  );

  if p_source = 'buffer_1c' and v_upload_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('p04-import-buffer:' || v_upload_id)
    );

    select snapshot.id
    into v_existing_snapshot_id
    from public.house_debtor_month_snapshots snapshot
    where snapshot.source = 'buffer_1c'
      and snapshot.import_meta->>'importBufferUploadId' = v_upload_id
    order by snapshot.created_at asc
    limit 1;

    if v_existing_snapshot_id is not null then
      return v_existing_snapshot_id;
    end if;
  end if;

  return public.import_house_debtor_month_draft(
    p_house_id,
    p_created_by,
    p_period_year,
    p_period_month,
    p_source,
    p_import_meta,
    p_rows
  );
end;
$$;

revoke all on function
  public.import_house_debtor_month_draft_idempotent(
    uuid,
    uuid,
    int,
    int,
    text,
    jsonb,
    jsonb
  )
from public, anon;

grant execute on function
  public.import_house_debtor_month_draft_idempotent(
    uuid,
    uuid,
    int,
    int,
    text,
    jsonb,
    jsonb
  )
to authenticated, service_role;
