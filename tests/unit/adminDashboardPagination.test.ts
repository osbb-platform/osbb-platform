import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const batchSource = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/services/getAdminDashboardBatchData.ts",
  ),
  "utf8",
);

const dashboardSource = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/services/getAdminDashboardV1.ts",
  ),
  "utf8",
);

describe("admin dashboard data completeness", () => {
  it("paginates house pages and apartments beyond Supabase's row cap", () => {
    expect(batchSource).toContain("DASHBOARD_BATCH_PAGE_SIZE");
    expect(batchSource.match(/\.range\(from, to\)/gu)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(batchSource.match(/while \(true\)/gu)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(batchSource).toContain(
      "if (pageRows.length < DASHBOARD_BATCH_PAGE_SIZE)",
    );
  });

  it("counts recent publications before limiting the visible feed", () => {
    expect(dashboardSource).toContain("recentPublicationItems");
    expect(dashboardSource).toContain(
      "const publications = recentPublicationItems",
    );
    expect(dashboardSource).toContain(
      "recentPublications7d: recentPublicationItems.length",
    );
  });

  it("keeps all apartment-dependent widgets on the same complete count map", () => {
    expect(dashboardSource).toContain(
      "hasApartments: (apartmentCounts.get(house.id) ?? 0) > 0",
    );
    expect(dashboardSource).toContain(
      "housesWithoutApartments: houseRows.filter((row) => !row.hasApartments)",
    );
    expect(dashboardSource).toContain(
      "const apartmentSetup = houseRows",
    );
    expect(dashboardSource).toContain(
      "const problematicHouses = houseRows",
    );
  });
});
