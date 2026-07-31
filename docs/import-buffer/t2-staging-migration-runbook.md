# P04/T2 — Import Buffer staging migration runbook

## Scope

Creates reusable staging only:

- `import_buffer_uploads`;
- `import_buffer_rows`;
- indexes;
- upload `updated_at` and `lock_version` trigger;
- authenticated admin-only RLS.

No parser, adapter, server command, UI, backfill, storage bucket or public read is
introduced in T2.

## Preflight SQL

```sql
select to_regclass('public.import_buffer_uploads');
select to_regclass('public.import_buffer_rows');
select to_regprocedure('public.admin_has_house_access(uuid)');
```

Expected:

- both table lookups return `null`;
- `public.admin_has_house_access(uuid)` exists.

Stop if either table already exists or the access helper is absent.

## Apply

Apply only to local/dev or preview first:

```bash
supabase migration up
```

Do not apply to production without explicit owner approval.

## Verification SQL

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.import_buffer_uploads'::regclass,
  'public.import_buffer_rows'::regclass
);

select policyname, tablename, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('import_buffer_uploads', 'import_buffer_rows')
order by tablename, policyname;
```

Expected:

- RLS enabled for both tables;
- upload policies: select/insert/update/delete;
- row policies: select/insert/update/delete;
- authenticated role only;
- no anon/public/resident policy.

## Negative checks

- anon insert into either table must fail;
- authenticated user without house access must not select/insert/update/delete;
- an admin with access to house A must not access upload rows of house B;
- a row cannot reference an upload outside the caller's house scope.

## Rollback / feature off

Forward-fix only:

- hide the `1С` UI entry;
- stop registering `debtors_1c`;
- leave staged data intact;
- repair policies/schema in a new migration.

T2 does not create a destructive rollback migration.
