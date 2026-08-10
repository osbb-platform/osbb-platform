import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const actionPath = path.join(
  process.cwd(),
  "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
);

const source = fs.readFileSync(actionPath, "utf8");

describe("P04 transfer action filters unmatched staging rows", () => {
  it("builds the P03 payload from matched staging rows only", () => {
    expect(source).toContain("const matchedRegistryRows = staged.data.filter");
    expect(source).toContain('row.match_status === "matched"');
    expect(source).toContain(
      "const matchedRows = matchedRegistryRows.filter",
    );
    expect(source).toContain("rows: matchedRows.map");
    expect(source).not.toContain("rows: staged.data.map");
  });

  it("keeps a zero-matched guard", () => {
    expect(source).toContain("if (matchedRegistryRows.length === 0)");
    expect(source).toContain(
      "Жоден рахунок не зіставлено з реєстром квартир. Перевірте реєстр будинку.",
    );
    expect(source).toContain('status: "failed"');
  });
});
