import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const loaderPath = new URL(
  "../../src/modules/houses/services/getAdminHouseSpecialists.ts",
  import.meta.url,
);

describe("specialist loader failure semantics", () => {
  it("does not turn required specialists or catalog failures into empty data", async () => {
    const source = await readFile(loaderPath, "utf8");

    expect(source).not.toContain(
      'console.error(\n      "Failed to load admin specialists:",',
    );
    expect(source).not.toContain(
      'console.error(\n      "Failed to load admin specialist categories:",',
    );
    expect(source).toContain(
      'throw new Error("Failed to load admin specialists.")',
    );
    expect(source).toContain(
      'throw new Error("Failed to load admin specialist categories.")',
    );
  });

  it("does not downgrade category-link infrastructure failure to an empty map", async () => {
    const source = await readFile(loaderPath, "utf8");

    expect(source).not.toContain("return new Map();");
    expect(source).toContain(
      'throw new Error("Failed to load specialist category links.")',
    );
  });
});
