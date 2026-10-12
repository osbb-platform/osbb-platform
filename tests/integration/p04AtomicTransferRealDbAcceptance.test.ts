import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  REAL_DB_TEST_TIMEOUT,
  sql,
  sqlAsync,
} from "../helpers/realDbSql";

function literalJson(value: unknown) {
  return JSON.stringify(value).replaceAll("'", "''");
}

describe("P04 atomic import-buffer transfer real DB acceptance", () => {
  const actorId = randomUUID();
  const companyId = randomUUID();
  const houseId = randomUUID();
  const apartmentIds = [randomUUID(), randomUUID(), randomUUID()];
  const publishedSnapshotId = randomUUID();
  const uploadId = randomUUID();
  const concurrentUploadId = randomUUID();
  const duplicateRegistryUploadId = randomUUID();

  const counters = {
    sourceRows: 5,
    registryRows: 3,
    classifiedRows: 5,
    unclassifiedRows: 0,
    technicalExcludedRows: 2,
    dataRows: 3,
    matchedRows: 2,
    unmatchedRows: 1,
    missingDebtRows: 0,
    transferableRows: 2,
    persistedRows: null,
  };

  function insertUpload(id: string) {
    sql(`
      insert into public.import_buffer_uploads (
        id, house_id, adapter_key, original_file_name, file_size,
        detected_period_year, detected_period_month,
        confirmed_period_year, confirmed_period_month,
        status, stats, created_by
      ) values (
        '${id}', '${houseId}', 'debtors_1c', 'synthetic.xlsx', 1024,
        2026, 9, 2026, 9, 'confirmed',
        '${literalJson({ counters })}'::jsonb, '${actorId}'
      );

      insert into public.import_buffer_rows (
        upload_id, row_index, classification, account_number_normalized,
        accrued, paid, debt_value, match_status, matched_apartment_id
      ) values
        ('${id}', 1, 'skip_service', null, null, null, null, 'skipped', null),
        ('${id}', 2, 'skip_total', null, null, null, null, 'skipped', null),
        ('${id}', 3, 'data', '1001', 10, 5, 700, 'matched', '${apartmentIds[0]}'),
        ('${id}', 4, 'data', '1002', 20, 7, 300, 'matched', '${apartmentIds[1]}'),
        ('${id}', 5, 'data', '9999', 1, 0, 50, 'unmatched', null);
    `);
  }

  function transferSql(id: string, acceptPartial: boolean) {
    return `select public.transfer_house_debtor_import_buffer_atomic(
      '${id}', '${houseId}', '${actorId}', 1, ${acceptPartial}, '{}'::jsonb
    );`;
  }

  beforeAll(() => {
    sql(`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', '${actorId}',
        'authenticated', 'authenticated',
        'p04-${actorId}@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb,
        now(), now()
      );

      insert into public.profiles (id, full_name, email)
      values ('${actorId}', 'P04 Synthetic Actor', 'p04-${actorId}@example.invalid')
      on conflict (id) do update
      set full_name = excluded.full_name, email = excluded.email;

      insert into public.management_companies (id, slug, name)
      values ('${companyId}', 'p04-${companyId}', 'P04 Synthetic Company');

      insert into public.houses (
        id, management_company_id, name, slug, address
      ) values (
        '${houseId}', '${companyId}', 'P04 Synthetic House',
        'p04-${houseId}', 'Synthetic address'
      );

      insert into public.house_apartments (
        id, house_id, account_number, apartment_label, owner_name, source_type
      ) values
        ('${apartmentIds[0]}', '${houseId}', 'л/с № 1001', '1', 'Synthetic A', 'manual'),
        ('${apartmentIds[1]}', '${houseId}', '1002', '2', 'Synthetic B', 'manual'),
        ('${apartmentIds[2]}', '${houseId}', '1003', '3', 'Synthetic C', 'manual');

      insert into public.house_debtor_month_snapshots (
        id, house_id, period_year, period_month, revision, source,
        import_meta, status, published_at, created_by
      ) values (
        '${publishedSnapshotId}', '${houseId}', 2026, 9, 1,
        'manual_import', '{}'::jsonb, 'published', now(), '${actorId}'
      );

      insert into public.house_debtor_month_rows (
        snapshot_id, house_id, apartment_id, account_number,
        apartment_label, owner_name, area, accrued, paid,
        closing_balance, debt_source_value
      ) values (
        '${publishedSnapshotId}', '${houseId}', '${apartmentIds[2]}',
        '1003', '3', 'Synthetic C', null, 1, 0, -900, 900
      );
    `);

    insertUpload(uploadId);
    insertUpload(concurrentUploadId);
    insertUpload(duplicateRegistryUploadId);
  }, REAL_DB_TEST_TIMEOUT * 3);

  afterAll(() => {
    sql(`
      drop trigger if exists p04_test_reject_completion
        on public.import_buffer_uploads;
      drop function if exists public.p04_test_reject_completion();
      delete from public.houses where id = '${houseId}';
      delete from public.management_companies where id = '${companyId}';
      delete from auth.users where id = '${actorId}';
    `);
  }, REAL_DB_TEST_TIMEOUT * 2);

  it("exists, is service_role-only, and closes the old wrapper privilege", () => {
    const signature =
      "public.transfer_house_debtor_import_buffer_atomic(uuid,uuid,uuid,integer,boolean,jsonb)";
    const oldSignature =
      "public.import_house_debtor_month_draft_idempotent(uuid,uuid,integer,integer,text,jsonb,jsonb)";

    expect(sql(`select to_regprocedure('${signature}');`)).toContain(
      "transfer_house_debtor_import_buffer_atomic",
    );
    expect(
      sql(`select has_function_privilege('anon','${signature}','execute');`),
    ).toBe("f");
    expect(
      sql(
        `select has_function_privilege('authenticated','${signature}','execute');`,
      ),
    ).toBe("f");
    expect(
      sql(`select has_function_privilege('service_role','${signature}','execute');`),
    ).toBe("t");
    expect(
      sql(
        `select has_function_privilege('authenticated','${oldSignature}','execute');`,
      ),
    ).toBe("f");
  }, REAL_DB_TEST_TIMEOUT);

  it("requires explicit partial-import confirmation without changing either side", () => {
    expect(() => sql(transferSql(uploadId, false))).toThrow(
      /P04_PARTIAL_CONFIRMATION_REQUIRED:1/,
    );
    expect(
      sql(`
        select status || '|' || lock_version || '|' ||
          (select count(*) from public.house_debtor_month_snapshots
           where import_meta->>'importBufferUploadId' = '${uploadId}')
        from public.import_buffer_uploads where id = '${uploadId}';
      `),
    ).toBe("confirmed|1|0");
  }, REAL_DB_TEST_TIMEOUT);

  it("rolls snapshot creation back when buffer completion fails", () => {
    sql(`
      create or replace function public.p04_test_reject_completion()
      returns trigger language plpgsql set search_path = '' as $$
      begin
        if new.id = '${uploadId}' and new.status = 'transferred' then
          raise exception 'P04_TEST_COMPLETION_FAILURE';
        end if;
        return new;
      end;
      $$;
      create trigger p04_test_reject_completion
      before update on public.import_buffer_uploads
      for each row execute function public.p04_test_reject_completion();
    `);

    expect(() => sql(transferSql(uploadId, true))).toThrow(
      /P04_TEST_COMPLETION_FAILURE/,
    );

    expect(
      sql(`
        select status || '|' || lock_version || '|' ||
          (select count(*) from public.house_debtor_month_snapshots
           where import_meta->>'importBufferUploadId' = '${uploadId}')
        from public.import_buffer_uploads where id = '${uploadId}';
      `),
    ).toBe("confirmed|1|0");

    sql(`
      drop trigger p04_test_reject_completion on public.import_buffer_uploads;
      drop function public.p04_test_reject_completion();
    `);
  }, REAL_DB_TEST_TIMEOUT * 2);

  it("rejects duplicate active accounts after 1C normalization", () => {
    // Preserve registryRows=3. Test normalized duplicates, not a count-drift gate.
    sql(`
      update public.house_apartments
      set account_number = '1001'
      where id = '${apartmentIds[2]}' and house_id = '${houseId}';
    `);

    try {
      expect(() => sql(transferSql(duplicateRegistryUploadId, true))).toThrow(
        /P04_DUPLICATE_REGISTRY_ACCOUNT/,
      );
      expect(
        sql(`
          select status || '|' || lock_version || '|' ||
            (select count(*) from public.house_debtor_month_snapshots
             where import_meta->>'importBufferUploadId' = '${duplicateRegistryUploadId}')
          from public.import_buffer_uploads
          where id = '${duplicateRegistryUploadId}';
        `),
      ).toBe("confirmed|1|0");
    } finally {
      sql(`
        update public.house_apartments
        set account_number = '1003'
        where id = '${apartmentIds[2]}' and house_id = '${houseId}';
      `);
    }
  }, REAL_DB_TEST_TIMEOUT * 2);

  it("commits snapshot, rows, upload and history once and preserves published revision", () => {
    const first = JSON.parse(sql(transferSql(uploadId, true))) as {
      snapshotId: string;
      persistedRows: number;
      lockVersion: number;
      created: boolean;
    };

    expect(first).toMatchObject({
      persistedRows: 2,
      lockVersion: 2,
      created: true,
    });

    expect(
      sql(`
        select upload.status || '|' || upload.lock_version || '|' ||
          snapshot.period_year || '-' || snapshot.period_month || '|' ||
          snapshot.revision || '|' || snapshot.status || '|' ||
          (select count(*) from public.house_debtor_month_rows row
           where row.snapshot_id = snapshot.id) || '|' ||
          (select count(*) from public.house_content_history history
           where history.entity_id = snapshot.id
             and history.action = 'debtors.month_imported')
        from public.import_buffer_uploads upload
        join public.house_debtor_month_snapshots snapshot
          on snapshot.id = (upload.stats->>'snapshotId')::uuid
        where upload.id = '${uploadId}';
      `),
    ).toBe("transferred|2|2026-9|2|draft|2|1");

    expect(
      sql(`
        select status || '|' || revision || '|' ||
          (select count(*) from public.house_debtor_month_rows
           where snapshot_id = '${publishedSnapshotId}')
        from public.house_debtor_month_snapshots
        where id = '${publishedSnapshotId}';
      `),
    ).toBe("published|1|1");

    expect(
      sql(`
        select string_agg(
          account_number || ':' || accrued || ':' || paid || ':' ||
            closing_balance || ':' || debt_source_value,
          '|' order by account_number
        )
        from public.house_debtor_month_rows
        where snapshot_id = '${first.snapshotId}';
      `),
    ).toBe("1002:20.00:7.00:-300.00:300.00|л/с № 1001:10.00:5.00:-700.00:700.00");

    const retry = JSON.parse(sql(transferSql(uploadId, true))) as {
      snapshotId: string;
      recovered: boolean;
    };
    expect(retry).toMatchObject({ snapshotId: first.snapshotId, recovered: true });
    expect(
      sql(`
        select count(*) || '|' ||
          (select count(*) from public.house_content_history
           where entity_id = '${first.snapshotId}'
             and action = 'debtors.month_imported')
        from public.house_debtor_month_snapshots
        where import_meta->>'importBufferUploadId' = '${uploadId}';
      `),
    ).toBe("1|1");
  }, REAL_DB_TEST_TIMEOUT * 2);

  it("serializes two concurrent submissions into one snapshot and one history row", async () => {
    const [left, right] = await Promise.all([
      sqlAsync(transferSql(concurrentUploadId, true)),
      sqlAsync(transferSql(concurrentUploadId, true)),
    ]);
    const leftResult = JSON.parse(left) as { snapshotId: string };
    const rightResult = JSON.parse(right) as { snapshotId: string };

    expect(leftResult.snapshotId).toBe(rightResult.snapshotId);
    expect(
      sql(`
        select count(*) || '|' ||
          (select count(*) from public.house_content_history
           where entity_id = '${leftResult.snapshotId}'
             and action = 'debtors.month_imported') || '|' ||
          (select status || ':' || lock_version
           from public.import_buffer_uploads
           where id = '${concurrentUploadId}')
        from public.house_debtor_month_snapshots
        where import_meta->>'importBufferUploadId' = '${concurrentUploadId}';
      `),
    ).toBe("1|1|transferred:2");
  }, REAL_DB_TEST_TIMEOUT * 2);
});
