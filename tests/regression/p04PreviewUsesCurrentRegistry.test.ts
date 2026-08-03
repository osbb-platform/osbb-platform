import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actions = readFileSync(
  join(
    process.cwd(),
    "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
  ),
  "utf8",
);

const state = readFileSync(
  join(process.cwd(), "src/modules/import-buffer/debtors1cImportState.ts"),
  "utf8",
);

describe("P04 current-registry preview", () => {
  it("shows current apartment identity after account matching", () => {
    expect(actions).toContain("const registryById = new Map(");
    expect(actions).toContain("registryRow?.apartmentLabel");
    expect(actions).toContain("registryRow?.ownerName");
  });

  it("keeps source identity only for mismatch diagnostics", () => {
    expect(state).toContain("sourceApartmentLabel: string | null");
    expect(state).toContain("sourceOwnerName: string | null");

    expect(actions).toContain("sourceApartmentLabel:");
    expect(actions).toContain("sourceOwnerName:");
  });

  it("keeps amounts attached to the normalized account", () => {
    expect(actions).toContain("row.source.accountNumberNormalized");
    expect(actions).toContain("debtValue: row.source.debtValue");
    expect(actions).toContain("osbbBalance: row.source.osbbBalance");
  });
});
