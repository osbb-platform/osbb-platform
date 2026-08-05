import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/components/HouseDebtorsWorkspace.tsx",
  ),
  "utf8",
);

describe("P03 debtor month lifecycle UX", () => {
  it("publishes and discards monthly snapshots with optimistic locking", () => {
    expect(source).toContain('type: "debtors.publishMonthSnapshot"');
    expect(source).toContain('type: "debtors.discardMonthSnapshot"');
    expect(source).toContain("draftMonthSnapshot.id");
    expect(source).toContain("draftMonthSnapshot.lockVersion");
  });

  it("supports relabelling a draft month before publication", () => {
    expect(source).toContain('type: "debtors.relabelMonthSnapshot"');
    expect(source).toContain("Змінити період чернетки");
  });

  it("renders current month summary and moves revision history to a side panel", () => {
    expect(source).toContain("Актуальна місячна версія");
    expect(source).toContain("HouseDebtorMonthHistoryPanel");
    expect(source).toContain("Історія версій");
    expect(source).not.toContain("Історія по місяцях");
    expect(source).toContain("Опубліковано");
    expect(source).toContain("Замінено");
    expect(source).toContain("Відхилено");
  });

  it("shows the latest published period", () => {
    expect(source).toContain("latestPublishedMonth");
    expect(source).toContain("Актуальний опублікований період");
  });
});
