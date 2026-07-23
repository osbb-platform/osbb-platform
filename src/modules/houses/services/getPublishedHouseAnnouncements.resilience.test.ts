import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/houses/services/getPublishedHouseAnnouncements.ts",
  ),
  "utf8",
);

describe("published announcements resilient read", () => {
  it("does not cache a required query failure as an empty list", () => {
    expect(source).toContain("PUBLIC_CONTENT_READ_FAILED");
    expect(source).toContain(
      "`Failed to load published announcements for house ${houseId}: ${error.message}`",
    );

    const requiredBlock =
      source.match(/if \(error\) \{[\s\S]*?\n  \}/)?.[0] ?? "";

    expect(requiredBlock).toContain("throw new Error(");
    expect(requiredBlock).not.toContain("return []");
  });

  it("keeps announcements visible when PDF metadata fails", () => {
    expect(source).toContain("PUBLIC_CONTENT_OPTIONAL_READ_FAILED");
    expect(source).toContain('resource: "house_content_files"');

    const optionalBlock =
      source.match(/if \(filesError\) \{[\s\S]*?\n    \}/)?.[0] ?? "";

    expect(optionalBlock).not.toContain("throw");
    expect(optionalBlock).not.toContain("return []");
  });

  it("invalidates the previous announcements cache value", () => {
    expect(source).toContain(
      '["published-house-announcements-v2", houseId]',
    );
    expect(source).not.toContain(
      '["published-house-announcements", houseId]',
    );
  });
});
