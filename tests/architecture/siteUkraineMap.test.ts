import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("site A4 Ukraine map", () => {
  it("implements the map as a shared data-driven component", () => {
    const source = read(
      "src/modules/site/components/blocks/UkraineMap.tsx",
    );

    expect(source).toContain("cities.map");
    expect(source).toContain("city.mapX");
    expect(source).toContain("city.mapY");
    expect(source).toContain("<svg");
    expect(source).toContain("<CityCards");
  });

  it("shows only city markers and counts", () => {
    const source = read(
      "src/modules/site/components/blocks/UkraineMap.tsx",
    );

    expect(source).toContain("city.housesCount");
    expect(source).not.toContain("house.slug");
    expect(source).not.toContain("apartments");
    expect(source).not.toContain("address");
  });

  it("distinguishes live and opening cities", () => {
    const source = read(
      "src/modules/site/components/blocks/UkraineMap.tsx",
    );

    expect(source).toContain("osbb-ukraine-map__marker--live");
    expect(source).toContain("osbb-ukraine-map__marker--opening");
    expect(source).toContain('city.status === "live"');
  });

  it("renders the Ukraine map on the home page", () => {
    const home = read("app/(site)/page.tsx");

    expect(home).toContain(
      'components/blocks/UkraineMap',
    );
    expect(home).toContain(
      "<UkraineMap cities={siteCities} />",
    );
    expect(home).not.toContain(
      "<CityCards cities={siteCities} />",
    );
  });

  it("provides the required narrow-mobile fallback", () => {
    const styles = read("app/(site)/site-theme.css");

    expect(styles).toContain("@media (max-width: 479px)");
    expect(styles).toContain(".osbb-ukraine-map__canvas");
    expect(styles).toContain(".osbb-ukraine-map__mobile");
    expect(styles).toContain("display: none");
    expect(styles).toContain("display: block");
  });
});
