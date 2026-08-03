import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("debtors 1C Server Action exports", () => {
  it("keeps runtime state outside the use-server module", () => {
    const actionFile = fs.readFileSync(
      path.join(
        root,
        "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
      ),
      "utf8",
    );

    const stateFile = fs.readFileSync(
      path.join(
        root,
        "src/modules/import-buffer/debtors1cImportState.ts",
      ),
      "utf8",
    );

    expect(actionFile).toContain('"use server"');
    expect(actionFile).not.toContain(
      "export const INITIAL_DEBTORS_1C_IMPORT_STATE",
    );

    expect(stateFile).not.toContain('"use server"');
    expect(stateFile).toContain(
      "export const INITIAL_DEBTORS_1C_IMPORT_STATE",
    );
  });
});
