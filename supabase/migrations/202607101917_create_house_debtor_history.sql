create table if not exists public.house_debtor_month_snapshots (
  id uuid primary key default gen1
fi

git switch -c "$TARGET_BRANCH"

echo
echo "=== CREATE MIGRATION ==="

cat > "$MIGRATION" <<'SQL'
create table if not exists public.house_debtor_month_snapshots (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null
    references public.houses(id)
    on delete cascade,

  period_year int not null
    check (period_year between 2000 and 2100),
  period_month int not null
    check (period_month between 1 and 12),
  revision int not null default 1
    check (revision >= 1),

  source text not null default 'manual_import'
    check (
      source in (
        'manual_import',
        'buffer_1c',
        'manual_edit',
        'migration_legacy'
      )
    ),

  import_meta jsonb not null default '{}'::jsonb
    check (jsonb_typeof(import_meta) = 'object'),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'published',
        'superseded',
        'discarded'
      )
    ),

  published_at timestamptz null,

  created_by uuid null
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  lock_version int not null default 1
    check (lock_version >= 1),

  constraint house_debtor_month_snapshots_house_period_revision_uq
    unique (
      house_id,
      period_year,
      period_month,
      revision
    ),

  constraint house_debtor_month_snapshots_id_house_uq
    unique (id, house_id)
);

create unique index if not exists
  house_debtor_month_snapshots_active_uq
on public.house_debtor_month_snapshots (
  house_id,
  period_year,
  period_month
)
where status = 'published';

create index if not exists
  house_debtor_month_snapshots_house_status_period_idx
on public.house_debtor_month_snapshots (
  house_id,
  status,
  period_year desc,
  period_month desc,
  revision desc
);


create table if not exists public.house_debtor_month_rows (
  id uuid primary key default gen_random_uuid(),

  snapshot_id uuid not null,
  house_id uuid not null
    references public.houses(id)
    on delete cascade,

  apartment_id uuid null
    references public.house_apartments(id)
    on delete set null,

  account_number text not null
    check (btrim(account_number) <> ''),

  apartment_label text not null default '',
  owner_name text not null default '',

  area numeric(10,2) null
    check (area is null or area >= 0),

  accrued numeric(12,2) null,
  paid numeric(12,2) null,

  closing_balance numeric(12,2) not null,
  debt_source_value numeric(12,2) null,

  constraint house_debtor_month_rows_snapshot_house_fk
    foreign key (snapshot_id, house_id)
    references public.house_debtor_month_snapshots (
      id,
      house_id
    )
    on delete cascade,

  constraint house_debtor_month_rows_snapshot_account_uq
    unique (snapshot_id, account_number)
);

create index if not exists
  house_debtor_month_rows_house_account_idx
on public.house_debtor_month_rows (
  house_id,
  account_number
);

create index if not exists
  house_debtor_month_rows_snapshot_idx
on public.house_debtor_month_rows (
  snapshot_id
);


create table if not exists public.house_debtor_series (
  house_id uuid not null
    references public.houses(id)
    on delete cascade,

  account_number text not null
    check (btrim(account_number) <> ''),

  as_of_year int not null
    check (as_of_year between 2000 and 2100),

  as_of_month int not null
    check (as_of_month between 1 and 12),

  months_in_debt int not null default 0
    check (months_in_debt >= 0),

  series_broken boolean not null default false,

  latest_balance numeric(12,2) not null,

  computed_at timestamptz not null default now(),

  primary key (
    house_id,
    account_number,
    as_of_year,
    as_of_month
  )
);

create index if not exists
  house_debtor_series_house_period_idx
on public.house_debtor_series (
  house_id,
  as_of_year desc,
  as_of_month desc,
  account_number
);


alter table public.house_debtor_month_snapshots
  enable row level security;

alter table public.house_debtor_month_rows
  enable row level security;

alter table public.house_debtor_series
  enable row level security;


drop policy if exists
  house_debtor_month_snapshots_admin_manage
on public.house_debtor_month_snapshots;

create policy house_debtor_month_snapshots_admin_manage
on public.house_debtor_month_snapshots
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);


drop policy if exists
  house_debtor_month_rows_admin_manage
on public.house_debtor_month_rows;

create policy house_debtor_month_rows_admin_manage
on public.house_debtor_month_rows
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);


drop policy if exists
  house_debtor_series_admin_manage
on public.house_debtor_series;

create policy house_debtor_series_admin_manage
on public.house_debtor_series
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);


do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception
      'Required function public.set_updated_at() is missing';
  end if;
end
$$;

drop trigger if exists
  house_debtor_month_snapshots_set_updated_at
on public.house_debtor_month_snapshots;

create trigger house_debtor_month_snapshots_set_updated_at
before update on public.house_debtor_month_snapshots
for each row
execute function public.set_updated_at();
