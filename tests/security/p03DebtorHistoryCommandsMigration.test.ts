
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
    /^\d{12}_add_house_debtor_history_commands\.sql$/u.test(name),
  );

  expect(matches).toHaveLength(1);

  return readFileSync(
    join(migrationsDir, matches[0]),
    "utf8",
  );
}

describe("P03 debtor history command migration", () => {
  it("creates all four atomic command functions", () => {
    const sql = loadMigration().toLowerCase();

    expect(sql).toContain(
      "function public.import_house_debtor_month_draft",
    );
    expect(sql).toContain(
      "function public.publish_house_debtor_month_snapshot",
    );
    expect(sql).toContain(
      "function public.discard_house_debtor_month_snapshot",
    );
    expect(sql).toContain(
      "function public.relabel_house_debtor_month_snapshot",
    );
  });

  it("keeps security definer mutations on the server-only boundary", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized.match(/security definer/gu)).toHaveLength(4);
    expect(normalized.match(/set search_path = ''/gu)).toHaveLength(4);
    expect(normalized).toContain("from public, authenticated");
    expect(normalized).toContain("to service_role");
    expect(normalized).not.toContain("to authenticated");
    expect(normalized).not.toContain("auth.uid()");
    expect(normalized).not.toContain("p03_forbidden");
  });

  it("enforces unknown-account blocking and atomic stale checks", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain("p03_unknown_account");
    expect(normalized).toContain("for update");
    expect(normalized).toContain(
      "p_expected_published_snapshot_ids uuid[]",
    );
    expect(normalized).toContain("p03_stale");
  });

  it("rebuilds series and the legacy public showcase in one RPC", () => {
    const normalized = loadMigration()
      .toLowerCase()
      .replace(/\s+/gu, " ");

    expect(normalized).toContain(
      "delete from public.house_debtor_series",
    );
    expect(normalized).toContain(
      "insert into public.house_debtor_series",
    );
    expect(normalized).toContain(
      "update public.house_debtors_items",
    );
    expect(normalized).toContain(
      "insert into public.house_debtors_items",
    );
  });

  it("contains SQL only", () => {
    const migration = loadMigration();

    expect(migration).not.toMatch(/\bgit\s+(switch|checkout)\b/u);
    expect(migration).not.toContain("<<'SQL'");
    expect(migration).not.toContain('echo "===');
  });
});
