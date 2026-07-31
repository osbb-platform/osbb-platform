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

  it("shows blockers, warnings and period confirmation", () => {
    expect(panel).toContain("Передача заблокована");
    expect(panel).toContain("Невідомі особові рахунки");
    expect(panel).toContain("Попереджень:");
    expect(panel).toContain("Підтвердити");
  });

  it("uses authenticated access and the existing Command Bus", () => {
    expect(actions).toContain("getCurrentAdminUser");
    expect(actions).toContain("assertWorkspaceAction");
    expect(actions).toContain('type: "debtors.importMonthDraft"');
    expect(actions).toContain('source: "buffer_1c"');
  });

  it("persists staging lifecycle with optimistic locks", () => {
    expect(actions).toContain('.from("import_buffer_uploads")');
    expect(actions).toContain('.from("import_buffer_rows")');
    expect(actions).toContain('.eq("lock_version", state.lockVersion)');
    expect(actions).toContain('status: "transferred"');
    expect(actions).toContain('status: "discarded"');
  });

  it("enforces file and hourly upload limits", () => {
    expect(actions).toContain("validateImportFileDescriptor");
    expect(actions).toContain("MAX_UPLOADS_PER_HOUR = 10");
    expect(actions).toContain("не більше 10 файлів на годину");
  });
});
