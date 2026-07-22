import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/houses/services/getPublishedHouseReports.ts",
  ),
  "utf8",
);

describe("published house reports resilient read", () => {
  it("throws on required report query failure", () => {
    expect(source).toContain("PUBLIC_CONTENT_READ_FAILED");
    expect(source).toContain(
      "`Failed to load published house reports for house ${houseId}: ${reportsResult.error.message}`",
    );

    expect(source).not.toContain("return emptyReports()");
    expect(source).not.toContain("function emptyReports()");
  });

  it("does not remove reports when categories fail", () => {
    expect(source).toContain(
      'resource: "house_report_categories"',
    );
    expect(source).toContain(
      "PUBLIC_CONTENT_OPTIONAL_READ_FAILED",
    );

    const categoryErrorBlock =
      source.match(
        /if \(categoriesResult\.error\) \{[\s\S]*?\n  \}/,
      )?.[0] ?? "";

    expect(categoryErrorBlock).not.toContain("return");
    expect(categoryErrorBlock).not.toContain("reports: []");
  });

  it("keeps report cards when file metadata fails", () => {
    expect(source).toContain(
      'resource: "house_content_files"',
    );

    const filesErrorBlock =
      source.match(
        /if \(filesError\) \{[\s\S]*?\n    \}/,
      )?.[0] ?? "";

    expect(filesErrorBlock).not.toContain("throw");
    expect(filesErrorBlock).not.toContain("return");
  });

  it("invalidates the previously cached false-empty value", () => {
    expect(source).toContain(
      '["published-house-reports-v3", houseId]',
    );
    expect(source).not.toContain(
      '["published-house-reports-v2", houseId]',
    );
  });
});
