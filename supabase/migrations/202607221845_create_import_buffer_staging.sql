-- P04/T2 — reusable import-buffer staging tables.
-- Forward-only migration. No backfill is required.
--
-- Preflight:
--   select to_regclass('public.import_buffer_uploads');
--   select to_regclass('public.import_buffer_rows');
--   select to_regprocedure('public.admin_has_house_access(uuid)');
--
-- Expected before apply:
--   both tables are null;
--   public.admin_has_house_access(uuid) exists.
--
-- Rollback strategy:
--   disable the P04 UI entry and forward-fix policies/schema.
--   Do not drop production staging data as an operational rollback.

create table if not exists public.import_buffer_uploads (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null
    references public.houses(id)
    on delete cascade,
  adapter_key text not null,
  original_file_name text not null,
  file_size integer not null
    check (file_size > 0),
  detected_period_year integer null
    check (
      detected_period_year is null
      or detected_period_year between 2000 and 2100
    ),
  detected_period_month integer null
    check (
      detected_period_month is null
      or detected_period_month between 1 and 12
    ),
  confirmed_period_year integer null
    check (
      confirmed_period_year is null
      or confirmed_period_year between 2000 and 2100
    ),
  confirmed_period_month integer null
    check (
      confirmed_period_month is null
      or confirmed_period_month between 1 and 12
    ),
  status text not null default 'parsed'
    check (
      status in (
        'parsed',
        'confirmed',
        'transferred',
        'failed',
        'discarded'
      )
    ),
  stats jsonb not null default '{}'::jsonb
    check (jsonb_typeof(stats) = 'object'),
  error text null,
  created_by uuid null
    references public.profiles(id)
    on delete set null,
  lock_version integer not null default 1
    check (lock_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint import_buffer_detected_period_pair_check
    check (
      (detected_period_year is null and detected_period_month is null)
      or
      (detected_period_year is not null and detected_period_month is not null)
    ),
  constraint import_buffer_confirmed_period_pair_check
    check (
      (confirmed_period_year is null and confirmed_period_month is null)
      or
      (confirmed_period_year is not null and confirmed_period_month is not null)
    )
);

create table if not exists public.import_buffer_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null
    references public.import_buffer_uploads(id)
    on delete cascade,
  row_index integer not null
    check (row_index >= 0),
  classification text not null
    check (
      classification in (
        'data',
        'skip_service',
        'skip_provider',
        'skip_group',
        'skip_total'
      )
    ),
  account_number_raw text null,
  account_number_normalized text null,
  apartment_label text null,
  owner_name text null,
  area numeric(10,2) null,
  opening_balance numeric(12,2) null,
  accrued numeric(12,2) null,
  paid numeric(12,2) null,
  closing_balance numeric(12,2) null,
  debt_value numeric(12,2) null,
  match_status text not null default 'unmatched'
    check (
      match_status in (
        'matched',
        'unmatched',
        'skipped'
      )
    ),
  matched_apartment_id uuid null
    references public.house_apartments(id)
    on delete set null,
  warnings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(warnings) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (upload_id, row_index),
  constraint import_buffer_row_match_check
    check (
      (match_status = 'matched' and matched_apartment_id is not null)
      or
      (match_status <> 'matched' and matched_apartment_id is null)
    ),
  constraint import_buffer_row_classification_match_check
    check (
      (classification = 'data' and match_status in ('matched', 'unmatched'))
      or
      (classification <> 'data' and match_status = 'skipped')
    )
);

create index if not exists import_buffer_uploads_house_status_idx
  on public.import_buffer_uploads(house_id, status, created_at desc);

create index if not exists import_buffer_uploads_house_adapter_idx
  on public.import_buffer_uploads(house_id, adapter_key, created_at desc);

create index if not exists import_buffer_rows_upload_classification_idx
  on public.import_buffer_rows(upload_id, classification, row_index);

create index if not exists import_buffer_rows_upload_match_idx
  on public.import_buffer_rows(upload_id, match_status, row_index);

create index if not exists import_buffer_rows_account_idx
  on public.import_buffer_rows(upload_id, account_number_normalized)
  where account_number_normalized is not null;

create or replace function public.touch_import_buffer_upload()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  new.lock_version := old.lock_version + 1;
  return new;
end;
$$;

drop trigger if exists import_buffer_uploads_touch
  on public.import_buffer_uploads;

create trigger import_buffer_uploads_touch
before update on public.import_buffer_uploads
for each row
execute function public.touch_import_buffer_upload();

alter table public.import_buffer_uploads enable row level security;
alter table public.import_buffer_rows enable row level security;

revoke all on table public.import_buffer_uploads from anon;
revoke all on table public.import_buffer_rows from anon;

grant select, insert, update, delete
  on table public.import_buffer_uploads
  to authenticated;

grant select, insert, update, delete
  on table public.import_buffer_rows
  to authenticated;

drop policy if exists import_buffer_uploads_admin_select
  on public.import_buffer_uploads;
create policy import_buffer_uploads_admin_select
on public.import_buffer_uploads
for select
to authenticated
using (
  public.admin_has_house_access(house_id)
);

drop policy if exists import_buffer_uploads_admin_insert
  on public.import_buffer_uploads;
create policy import_buffer_uploads_admin_insert
on public.import_buffer_uploads
for insert
to authenticated
with check (
  public.admin_has_house_access(house_id)
  and created_by = auth.uid()
);

drop policy if exists import_buffer_uploads_admin_update
  on public.import_buffer_uploads;
create policy import_buffer_uploads_admin_update
on public.import_buffer_uploads
for update
to authenticated
using (
  public.admin_has_house_access(house_id)
)
with check (
  public.admin_has_house_access(house_id)
);

drop policy if exists import_buffer_uploads_admin_delete
  on public.import_buffer_uploads;
create policy import_buffer_uploads_admin_delete
on public.import_buffer_uploads
for delete
to authenticated
using (
  public.admin_has_house_access(house_id)
);

drop policy if exists import_buffer_rows_admin_select
  on public.import_buffer_rows;
create policy import_buffer_rows_admin_select
on public.import_buffer_rows
for select
to authenticated
using (
  exists (
    select 1
    from public.import_buffer_uploads upload
    where upload.id = import_buffer_rows.upload_id
      and public.admin_has_house_access(upload.house_id)
  )
);

drop policy if exists import_buffer_rows_admin_insert
  on public.import_buffer_rows;
create policy import_buffer_rows_admin_insert
on public.import_buffer_rows
for insert
to authenticated
with check (
  exists (
    select 1
    from public.import_buffer_uploads upload
    where upload.id = import_buffer_rows.upload_id
      and public.admin_has_house_access(upload.house_id)
  )
);

drop policy if exists import_buffer_rows_admin_update
  on public.import_buffer_rows;
create policy import_buffer_rows_admin_update
on public.import_buffer_rows
for update
to authenticated
using (
  exists (
    select 1
    from public.import_buffer_uploads upload
    where upload.id = import_buffer_rows.upload_id
      and public.admin_has_house_access(upload.house_id)
  )
)
with check (
  exists (
    select 1
    from public.import_buffer_uploads upload
    where upload.id = import_buffer_rows.upload_id
      and public.admin_has_house_access(upload.house_id)
  )
);

drop policy if exists import_buffer_rows_admin_delete
  on public.import_buffer_rows;
create policy import_buffer_rows_admin_delete
on public.import_buffer_rows
for delete
to authenticated
using (
  exists (
    select 1
    from public.import_buffer_uploads upload
    where upload.id = import_buffer_rows.upload_id
      and public.admin_has_house_access(upload.house_id)
  )
);

comment on table public.import_buffer_uploads is
  'P04 reusable import staging uploads. Rows older than 90 days are retention candidates; cleanup is outside P04 scope.';

comment on table public.import_buffer_rows is
  'P04 normalized preview rows. 1C identity fields are reconciliation data; house_apartments remains authoritative.';

-- Verification:
--   select relname, relrowsecurity
--   from pg_class
--   where oid in (
--     'public.import_buffer_uploads'::regclass,
--     'public.import_buffer_rows'::regclass
--   );
--
--   select policyname, tablename, roles, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('import_buffer_uploads', 'import_buffer_rows')
--   order by tablename, policyname;
--
-- Expected:
--   RLS enabled on both tables;
--   four authenticated admin policies on each table;
--   no anon grants or public/resident policies.
