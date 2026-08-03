import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const cityScope = [
  "src/modules/site/components/blocks/CityLanding.tsx",
  "src/modules/site/components/blocks/CityCards.tsx",
  "src/modules/site/components/blocks/UkraineMap.tsx",
  "app/(site)/znayty-budynok/page.tsx",
  "app/(site)/kyiv/page.tsx",
  "app/(site)/odesa/page.tsx",
] as const;

describe("site fixed product decisions", () => {
  it("does not use the seasonal status for cities", () => {
    const source = cityScope.map(read).join("\n");

    expect(source).not.toContain("Восени 2026");
    expect(source).not.toContain("восени 2026");
  });

  it("uses neutral labels for opening cities", () => {
    const cityLanding = read(
      "src/modules/site/components/blocks/CityLanding.tsx",
    );

    const cityCards = read(
      "src/modules/site/components/blocks/CityCards.tsx",
    );

    const searchPage = read(
      "app/(site)/znayty-budynok/page.tsx",
    );

    expect(cityLanding).toContain("Відкриваємо місто");
    expect(cityCards).toContain("Відкриваємо місто");
    expect(searchPage).toContain("Відкриваємо місто");
  });

  it("does not assign the seasonal label by default", () => {
    const badge = read(
      "src/modules/site/components/ui/StatusBadge.tsx",
    );

    expect(badge).not.toContain(
      'children = "Восени 2026"',
    );

    expect(badge).toContain(
      'children = "Скоро"',
    );
  });

  it("preserves seasonal copy for approved product roadmap items", () => {
    const home = read("app/(site)/page.tsx");
    const content = read(
      "src/modules/site/data/siteContent.ts",
    );

    expect(home).toContain("Восени 2026");
    expect(content).toContain("Восени 2026");
  });
});
