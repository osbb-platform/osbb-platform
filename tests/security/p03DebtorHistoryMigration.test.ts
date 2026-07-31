import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

function loadMigration() {
  const migrationsDir = join(
    process.cwd(),
    "supabase",
    "migrations",
  );

  const matches = readdirSync(migrationsDir)
    .filter((name) =>
      /^\d{12}_create_house_debtor_history\.sql$/u.test(name),
    );

  expect(matches).toHaveLength(1);

  return readFileSync(
    join(migrationsDir, matches[0]),
    "utf8",
  );
}

describe("P03 debtor history migration", () => {
  it("contains only executable SQL from the first statement", () => {
    const migration = loadMigration();
    const normalized = migration.trimStart().toLowerCase();

    expect(normalized.startsWith(
      "create table if not exists public.house_debtor_month_snapshots",
    )).toBe(true);

    expect(migration).not.toMatch(/\bgit\s+(switch|checkout)\b/u);
    expect(migration).not.toContain("<<'SQL'");
    expect(migration).not.toContain('echo "===');
  });

  it("creates all three normalized history tables", () => {
    const sql = loadMigration().toLowerCase();

    expect(sql).toContain(
      "create table if not exists public.house_debtor_month_snapshots",
    );
    expect(sql).toContain(
      "create table if not exists public.house_debtor_month_rows",
    );
    expect(sql).toContain(
      "create table if not exists public.house_debtor_series",
    );
  });

  it("enforces revision, active snapshot and tenant-row invariants", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "unique ( house_id, period_year, period_month, revision )",
    );

    expect(normalized).toContain(
      "where status = 'published'",
    );

    expect(normalized).toContain(
      "foreign key (snapshot_id, house_id)",
    );

    expect(normalized).toContain(
      "references public.house_debtor_month_snapshots ( id, house_id )",
    );

    expect(normalized).toContain(
      "unique (snapshot_id, account_number)",
    );
  });

  it("keeps authenticated reads house-scoped and mutations private", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    const rlsStatements =
      normalized.match(/enable row level security/gu) ?? [];

    const readPolicies =
      normalized.match(/create policy house_debtor_[a-z_]+_admin_read/gu) ?? [];

    expect(rlsStatements).toHaveLength(3);
    expect(readPolicies).toHaveLength(3);

    expect(normalized).toContain("for select to authenticated");
    expect(normalized).toContain("from public.admin_memberships");
    expect(normalized).toContain("membership.user_id = auth.uid()");
    expect(normalized).toContain("membership.house_id is null");

    expect(normalized).not.toContain("for all to authenticated");
    expect(normalized).not.toContain("to anon");
    expect(normalized).not.toContain("using (true)");
  });

  it("installs updated_at handling without destructive data changes", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "execute function public.set_updated_at()",
    );

    expect(normalized).not.toContain("drop table");
    expect(normalized).not.toContain("truncate ");
    expect(normalized).not.toContain("delete from public.");
  });
});
