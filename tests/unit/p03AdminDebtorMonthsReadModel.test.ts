import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readService() {
  return readFileSync(
    join(
      process.cwd(),
      "src/modules/houses/services/getAdminHouseDebtors.ts",
    ),
    "utf8",
  );
}

describe("P03 admin debtor month read model", () => {
  it("loads monthly snapshots and snapshot-row counts", () => {
    const source = readService();

    expect(source).toContain(
      '.from("house_debtor_month_snapshots")',
    );
    expect(source).toContain(
      '.from("house_debtor_month_rows")',
    );
    expect(source).toContain("rowsCount");
  });

  it("exposes period, revision, source, status and lock version", () => {
    const source = readService();

    for (const field of [
      "periodYear",
      "periodMonth",
      "revision",
      "source",
      "status",
      "lockVersion",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("provides draft and latest-published month projections", () => {
    const source = readService();

    expect(source).toContain("monthSnapshots");
    expect(source).toContain("draftMonthSnapshots");
    expect(source).toContain("latestPublishedMonth");
    expect(source).toContain(
      'snapshot.status === "published"',
    );
    expect(source).toContain(
      'snapshot.status === "draft"',
    );
  });

  it("sorts newest periods and revisions first", () => {
    const source = readService();

    expect(source).toContain(
      'order("period_year", { ascending: false })',
    );
    expect(source).toContain(
      'order("period_month", { ascending: false })',
    );
    expect(source).toContain(
      'order("revision", { ascending: false })',
    );
  });
});
