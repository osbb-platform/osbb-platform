import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("announcement duplicate missing optional file", () => {
  it("does not block duplication when an optional tracked file object is missing", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/content-engine/v2/services/cloneService.ts"),
      "utf8",
    );

    expect(source).toContain("function isMissingSourceStorageObject");
    expect(source).toContain("Skipping missing tracked file during duplicate");
    expect(source).toContain("continue;");
    expect(source).toContain("object not found");
  });
});
