import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/components/HouseDebtorsWorkspace.tsx",
  ),
  "utf8",
);

const panel = readFileSync(
  join(
    process.cwd(),
    "src/modules/import-buffer/components/HouseDebtors1cImportPanel.tsx",
  ),
  "utf8",
);

const actions = readFileSync(
  join(
    process.cwd(),
    "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
  ),
  "utf8",
);

describe("P04 T6 admin import flow", () => {
  it("adds compact 1C entry and shared side panel", () => {
    expect(workspace).toContain('aria-label="Імпорт боржників з 1С"');
    expect(workspace).toContain("HouseDebtors1cImportPanel");
    expect(panel).toContain("AdminSidePanel");
    expect(panel).toContain('accept=".xls,.xlsx"');
  });

  it("guards destructive closing and uses the table-sized panel", () => {
    expect(panel).toContain("PlatformConfirmModal");
    expect(panel).toContain("requestClose");
    expect(panel).toContain("discardAndClose");
    expect(panel).toContain("resetLocalImportState");
    expect(panel).toContain('maxWidthClassName="max-w-4xl"');
    expect(panel).toContain("Скасувати імпорт з 1С?");
    expect(panel).toContain("Продовжити перевірку");
    expect(panel).toContain("fileInputRef.current.value");
  });

  it("shows unmatched visibility, warnings and period confirmation", () => {
    expect(panel).toContain("Не увійде до вітрини:");
    expect(panel).toContain("<details");
    expect(panel).toContain("unmatchedRows");
    expect(panel).toContain("Попереджень:");
    expect(panel).toContain("Підтвердити");
    expect(panel).toContain("partialTransferAccepted");
    expect(panel).toContain("Підтверджую частковий перенос");
    expect(panel).toContain("До переносу:");
    expect(panel).toContain("фізично збережено:");
    expect(panel).toContain("Публічних після публікації (≥500 ₴):");
  });

  it("uses authenticated access and the existing Command Bus", () => {
    expect(actions).toContain("getCurrentAdminUser");
    expect(actions).toContain("assertWorkspaceAction");
    expect(actions).toContain('type: "debtors.importMonthDraft"');
    expect(actions).toContain('source: "buffer_1c"');
    expect(actions).toContain("resolveStoredConfirmedPeriod(upload.data)");
    expect(actions).toContain("periodYear: confirmedPeriod.year");
    expect(actions).not.toContain("periodYear: state.confirmedPeriod.year");
  });

  it("persists staging lifecycle with optimistic locks", () => {
    expect(actions).toContain('.from("import_buffer_uploads")');
    expect(actions).toContain('.from("import_buffer_rows")');
    expect(actions).toContain('.eq("lock_version", state.lockVersion)');
    expect(actions).toContain('status: "transferred"');
    expect(actions).toContain('status: "discarded"');
    expect(actions).toContain("readAllCountedPages<StagedRow>");
    expect(actions).toContain("persistedRows !== counters.transferableRows");
  });

  it("enforces file validation without a global hourly employee cap", () => {
    expect(actions).toContain("validateImportFileDescriptor");
    expect(actions).toContain("rateLimitPolicies.importBufferUpload");
    expect(actions).not.toContain("MAX_UPLOADS_PER_HOUR");
    expect(actions).not.toContain("не більше 10 файлів на годину");
    expect(actions).not.toContain('.gte("created_at", since)');
  });
});
