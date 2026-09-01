import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  houseSearchTextMatches,
  normalizeHouseSearchText,
} from "../../src/modules/houses/utils/houseSearch";

const candidate = [
  'ОСББ "Запоріжжя -миру №5"',
  "м. Запоріжжя, вул.Миру, 5",
  "osbb-zaporizhzhya-miru-5",
];

describe("U1-T3 normalizeHouseSearchText", () => {
  it("normalizes Unicode, case, NBSP, whitespace and punctuation separators", () => {
    expect(
      normalizeHouseSearchText(
        "  ВУЛ.\u00a0Миру, №5  ",
      ),
    ).toBe("вул миру 5");

    expect(normalizeHouseSearchText("Миру-5")).toBe(
      "миру 5",
    );
    expect(normalizeHouseSearchText("Миру—5")).toBe(
      "миру 5",
    );
  });

  it("applies the practical Ukrainian/Russian і/и alias", () => {
    expect(normalizeHouseSearchText("Міру 5")).toBe(
      normalizeHouseSearchText("Миру 5"),
    );
  });

  it("matches every required production-candidate query", () => {
    for (const query of [
      "Зап",
      "Запоріжжя",
      "Миру 5",
      "Міру 5",
      "миру №5",
      "вул миру 5",
    ]) {
      expect(
        houseSearchTextMatches(candidate, query),
        query,
      ).toBe(true);
    }
  });

  it("does not introduce broad Cyrillic/Latin homoglyph folding", () => {
    expect(normalizeHouseSearchText("миру")).not.toBe(
      normalizeHouseSearchText("mиру"),
    );
  });

  it("is wired to every house-search surface", () => {
    for (const file of [
      "src/modules/houses/components/HousesRegistryWorkspace.tsx",
      "src/modules/houses/components/HouseSwitcher.tsx",
      "src/modules/houses/components/CrossHouseDuplicatePanel.tsx",
      "src/modules/houses/services/searchPublicHouses.ts",
    ]) {
      const source = fs.readFileSync(
        path.join(process.cwd(), file),
        "utf8",
      );
      expect(source).toContain("normalizeHouseSearchText");
    }
  });
});
