import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  compareHouseDisplayOrder,
  sortHousesByDisplayOrder,
} from "../../src/modules/houses/utils/houseNaturalOrder";

describe("U1-T4 house natural order", () => {
  it("sorts numeric street names naturally", () => {
    const houses = [
      { id: "3", name: "Миру 10", address: "вул. Миру, 10" },
      { id: "1", name: "Миру 2", address: "вул. Миру, 2" },
      { id: "2", name: "Миру 5", address: "вул. Миру, 5" },
    ];

    expect(
      sortHousesByDisplayOrder(houses).map((house) => house.name),
    ).toEqual(["Миру 2", "Миру 5", "Миру 10"]);
  });

  it("falls back to address when display name is empty", () => {
    const houses = [
      { id: "b", name: "   ", address: "Миру 10" },
      { id: "a", name: "", address: "Миру 2" },
    ];

    expect(
      sortHousesByDisplayOrder(houses).map(
        (house) => house.address,
      ),
    ).toEqual(["Миру 2", "Миру 10"]);
  });

  it("has a deterministic id tie-breaker", () => {
    const left = {
      id: "house-b",
      name: "Миру 5",
      address: "Миру 5",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const right = {
      id: "house-a",
      name: "Миру 5",
      address: "Миру 5",
      created_at: "2026-01-01T00:00:00.000Z",
    };

    expect(compareHouseDisplayOrder(left, right)).toBeGreaterThan(0);
    expect(compareHouseDisplayOrder(right, left)).toBeLessThan(0);
  });

  it("does not mutate source arrays", () => {
    const source = [
      { id: "2", name: "Миру 10", address: "" },
      { id: "1", name: "Миру 2", address: "" },
    ];
    const before = [...source];

    sortHousesByDisplayOrder(source);

    expect(source).toEqual(before);
  });

  it("wires service, active/archive registry and switcher", () => {
    const service = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/services/getAdminHouses.ts",
      ),
      "utf8",
    );
    const registry = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/components/HousesRegistryWorkspace.tsx",
      ),
      "utf8",
    );
    const switcher = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/components/HouseSwitcher.tsx",
      ),
      "utf8",
    );

    expect(service).toContain(
      "return sortHousesByDisplayOrder(typedData);",
    );
    expect(registry).toContain(
      "const safeHouses = sortHousesByDisplayOrder(",
    );
    expect(registry).toContain(
      "const activeHouses = safeHouses.filter",
    );
    expect(registry).toContain(
      "const archivedHouses = safeHouses.filter",
    );
    expect(switcher).toContain(
      "sortHousesByDisplayOrder(houses)",
    );
  });

  it("preserves explicit recent-house history order", () => {
    const switcher = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/components/HouseSwitcher.tsx",
      ),
      "utf8",
    );

    expect(switcher).toContain(
      ".map((id) => houses.find((house) => house.id === id))",
    );
    expect(switcher).not.toContain(
      "sortHousesByDisplayOrder(recentHouses)",
    );
  });
});
