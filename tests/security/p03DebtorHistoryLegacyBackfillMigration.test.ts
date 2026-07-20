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

  const matches = readdirSync(migrationsDir).filter((name) =>
    /^\d{12}_backfill_house_debtors_june_2026\.sql$/u.test(name),
  );

  expect(matches).toHaveLength(1);

  return readFileSync(
    join(migrationsDir, matches[0]),
    "utf8",
  );
}

describe("P03 June 2026 legacy debtor backfill migration", () => {
  it("backfills only published legacy rows into June 2026", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain("period_year, period_month");
    expect(normalized).toContain("2026, 6");
    expect(normalized).toContain("'migration_legacy'");
    expect(normalized).toContain("item.lifecycle_status = 'published'");

    expect(normalized).not.toContain(
      "item.lifecycle_status in ('published', 'draft'",
    );
    expect(normalized).not.toContain(
      "item.lifecycle_status <> 'archived'",
    );
  });

  it("preserves every published balance row, not only the public threshold", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "insert into public.house_debtor_month_rows",
    );
    expect(normalized).toContain(
      "from public.house_debtors_items item",
    );

    const rowsInsertSection = normalized.split(
      "insert into public.house_debtor_month_rows",
    )[1]?.split(
      "insert into public.house_debtor_series",
    )[0] ?? "";

    expect(rowsInsertSection).not.toContain("<= -500");
  });

  it("initializes the June series using the approved -500 boundary", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "insert into public.house_debtor_series",
    );
    expect(normalized).toContain(
      "when month_row.closing_balance <= -500 then 1",
    );
    expect(normalized).toContain(
      "series_broken",
    );
    expect(normalized).toContain(
      "false",
    );
  });

  it("is idempotent and does not rewrite the legacy public showcase", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "where not exists",
    );
    expect(normalized).toContain(
      "snapshot.period_year = 2026",
    );
    expect(normalized).toContain(
      "snapshot.period_month = 6",
    );

    expect(normalized).not.toContain(
      "update public.house_debtors_items",
    );
    expect(normalized).not.toContain(
      "delete from public.house_debtors_items",
    );
    expect(normalized).not.toContain(
      "insert into public.house_debtors_items",
    );
  });

  it("blocks malformed legacy balances instead of silently coercing them", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "p03_legacy_unparseable_amount",
    );
    expect(normalized).toContain(
      "regexp_replace",
    );
    expect(normalized).toContain(
      "::numeric",
    );
  });

  it("contains executable SQL only", () => {
    const migration = loadMigration();

    expect(migration).not.toMatch(/\bgit\s+(switch|checkout)\b/u);
    expect(migration).not.toContain("<<'SQL'");
    expect(migration).not.toContain('echo "===');
  });
});
