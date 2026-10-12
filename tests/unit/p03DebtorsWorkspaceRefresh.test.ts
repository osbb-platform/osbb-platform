import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const page = readFileSync(
  join(
    process.cwd(),
    "app/(admin)/admin/(protected)/houses/[id]/page.tsx",
  ),
  "utf8",
);

describe("P03 debtor workspace refresh", () => {
  it("remounts stale local rows when the authoritative snapshot changes", () => {
    expect(page).toContain("debtorsData?.latestPublishedMonth?.lockVersion");
    expect(page).toContain("debtorsData?.draftMonthSnapshots[0]?.lockVersion");
    expect(page).toContain("${apartment.id}@${apartment.updated_at}");
  });
});
