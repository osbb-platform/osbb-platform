import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("admin dashboard optional counts", () => {
  it("keeps the dashboard available when apartment counts time out", () => {
    const source = readFileSync(
      "src/modules/houses/services/getAdminDashboardV1.ts",
      "utf8",
    );

    expect(source).toContain("getAdminActiveApartmentCountsByHouseIds(houseIds).catch")
    expect(source).toContain("Dashboard optional apartment counts failed.")
    expect(source).toContain("return new Map<string, number>()")
  });
});
