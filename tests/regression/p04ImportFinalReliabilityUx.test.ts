import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const actions = read(
  "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
);
const panel = read(
  "src/modules/import-buffer/components/HouseDebtors1cImportPanel.tsx",
);
const workspace = read(
  "src/modules/houses/components/HouseDebtorsWorkspace.tsx",
);
const historyPanel = read(
  "src/modules/houses/components/HouseDebtorMonthHistoryPanel.tsx",
);
const command = read(
  "src/modules/content-engine/v2/handlers/debtors/commands/importMonthDraft.ts",
);
const migration = read(
  "supabase/migrations/202608050001_p04_idempotent_import_buffer_transfer.sql",
);

describe("P04 final import reliability and history UX", () => {
  it("recovers completed server state instead of reporting a false stale error", () => {
    expect(actions).toContain("recoverConfirmedDebtors1cImportState");
    expect(actions).toContain("recoverTransferredDebtors1cImportState");
    expect(actions).toContain('"status, lock_version');
    expect(actions).toContain("originalFileName");
  });

  it("prevents the same client from starting two final commands", () => {
    expect(panel).toContain("commandInFlightRef");
    expect(panel).toContain("beginCommand");
    expect(panel).toContain("finishCommand");
    expect(panel).toContain("Чернетку успішно створено");
  });

  it("uses a DB-level idempotent monthly draft RPC", () => {
    expect(command).toContain('"import_house_debtor_month_draft_idempotent"');
    expect(migration).toContain(
      "house_debtor_month_snapshots_buffer_upload_uq",
    );
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("importBufferUploadId");
  });

  it("keeps only the current version summary on the main page", () => {
    expect(workspace).toContain("Актуальна місячна версія");
    expect(workspace).toContain("HouseDebtorMonthHistoryPanel");
    expect(workspace).not.toContain("Історія по місяцях");
  });

  it("renders the full revision history inside a side panel", () => {
    expect(historyPanel).toContain("AdminSidePanel");
    expect(historyPanel).toContain("Історія версій боржників");
    expect(historyPanel).toContain("originalFileName");
    expect(historyPanel).toContain("Відкрити актуальну чернетку");
  });
});
