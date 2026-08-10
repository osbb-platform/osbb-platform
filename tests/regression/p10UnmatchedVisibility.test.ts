import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const actions = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
  ),
  "utf8",
);

const panel = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/import-buffer/components/HouseDebtors1cImportPanel.tsx",
  ),
  "utf8",
);

const workspace = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/houses/components/HouseDebtorsWorkspace.tsx",
  ),
  "utf8",
);

describe("P10 T3 unmatched visibility", () => {
  it("persists unmatched accounts and signed unmatched total in import_meta", () => {
    expect(actions).toContain("unmatchedAccounts");
    expect(actions).toContain("unmatchedDebtTotal");
    expect(actions).toContain("apartment_label");
    expect(actions).toContain("toOsbbBalance");
  });

  it("marks a fully unmatched upload failed with the required message", () => {
    expect(actions).toContain('status: "failed"');
    expect(actions).toContain(
      "Жоден рахунок не зіставлено з реєстром квартир. Перевірте реєстр будинку.",
    );
  });

  it("shows an expandable unmatched summary in preview", () => {
    expect(panel).toContain("Не увійде до вітрини:");
    expect(panel).toContain("<details");
    expect(panel).toContain("unmatchedRows");
  });

  it("keeps unmatched amount visible on the latest published snapshot", () => {
    expect(workspace).toContain("publishedUnmatchedDebtTotal");
    expect(workspace).toContain("latestPublishedMonth?.importMeta");
    expect(workspace).toContain("unmatchedDebtTotal");
    expect(workspace).toContain("Не увійшло до вітрини:");
    expect(workspace).toContain("AdminStatusBadge");
  });
});
