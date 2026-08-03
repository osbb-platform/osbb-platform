import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const audiencePages = [
  "app/(site)/demo/page.tsx",
  "app/(site)/meshkantsyam/page.tsx",
  "app/(site)/kyiv/page.tsx",
  "app/(site)/odesa/page.tsx",
  "app/(site)/znayty-budynok/page.tsx",
] as const;

describe("site A3 audience pages", () => {
  it("removes placeholders from demo, resident, city and search pages", () => {
    for (const page of audiencePages) {
      const source = read(page);

      expect(source).not.toContain("SiteRoutePlaceholder");
    }

    const directlyRenderedPages = [
      "app/(site)/demo/page.tsx",
      "app/(site)/meshkantsyam/page.tsx",
      "app/(site)/znayty-budynok/page.tsx",
    ];

    for (const page of directlyRenderedPages) {
      expect(read(page)).toContain('id="main"');
    }

    const cityLanding = read(
      "src/modules/site/components/blocks/CityLanding.tsx",
    );

    expect(cityLanding).toContain('<main id="main">');
  });

  it("centralizes city-page rendering", () => {
    const kyiv = read("app/(site)/kyiv/page.tsx");
    const odesa = read("app/(site)/odesa/page.tsx");
    const cityLanding = read(
      "src/modules/site/components/blocks/CityLanding.tsx",
    );

    expect(kyiv).toContain("<CityLanding");
    expect(odesa).toContain("<CityLanding");
    expect(cityLanding).toContain("<CtaBlock");
  });

  it("keeps the demo code and URL in siteContent", () => {
    const demo = read("app/(site)/demo/page.tsx");

    expect(demo).toContain("siteSettings.demoHouseCode");
    expect(demo).toContain("siteSettings.demoHouseUrl");

    expect(demo).not.toContain("301545");
    expect(demo).not.toContain("demo.osbb-platform.com.ua");
  });

  it("keeps real house search for C3", () => {
    const search = read(
      "src/modules/site/components/blocks/HouseSearch.tsx",
    );

    expect(search).toContain('type="button"');
    expect(search).not.toContain("fetch(");
    expect(search).not.toContain("/api/company/search-houses");
  });

  it("does not include prohibited real-house references", () => {
    const source = audiencePages
      .map(read)
      .join("\n");

    expect(source).not.toContain("osbb-ekspres-4");
    expect(source).not.toContain("224466");
  });
});
