import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("site B1 live counters", () => {
  it("implements one cached server-side counter service", () => {
    const source = read(
      "src/modules/site/services/getSiteCounters.ts",
    );

    expect(source).toContain("unstable_cache");
    expect(source).toContain("revalidate: SITE_COUNTERS_REVALIDATE_SECONDS");
    expect(source).toContain(
      "const SITE_COUNTERS_REVALIDATE_SECONDS = 600",
    );
    expect(source).toContain('tags: ["site:counters"]');
  });

  it("counts only active non-archived houses", () => {
    const source = read(
      "src/modules/site/services/getSiteCounters.ts",
    );

    expect(source).toContain('.from("houses")');
    expect(source).toContain('.eq("is_active", true)');
    expect(source).toContain('.is("archived_at", null)');
    expect(source).toContain('count: "exact"');
    expect(source).toContain("head: true");
  });

  it("counts live cities and recent publication events", () => {
    const source = read(
      "src/modules/site/services/getSiteCounters.ts",
    );

    expect(source).toContain('.from("site_cities")');
    expect(source).toContain('.eq("status", "live")');
    expect(source).toContain('.from("house_content_history")');
    expect(source).toContain('.gte("occurred_at", cutoff)');
    expect(source).toContain('.ilike("action", "%publish%")');
  });

  it("returns null instead of breaking the site on database errors", () => {
    const source = read(
      "src/modules/site/services/getSiteCounters.ts",
    );

    expect(source).toContain("Promise<SiteCounters | null>");
    expect(source).toContain("return null");
    expect(source).toContain("try {");
    expect(source).toContain("catch (error)");
  });

  it("renders every homepage number from the live service", () => {
    const home = read("app/(site)/page.tsx");

    expect(home).toContain("await Promise.all");
    expect(home).toContain("getSiteCounters()");
    expect(home).toContain("{siteCounters ? (");
    expect(home).toContain("siteCounters.housesLive");
    expect(home).toContain("siteCounters.materialsLast30");
    expect(home).toContain("siteCounters.citiesLive");
    expect(home).toContain("siteCounters.sectionsCount");

    expect(home).not.toContain("sitePrototypeFigures");
    expect(home).not.toContain('value={250}');
    expect(home).not.toContain('value={9}');
    expect(home).not.toContain('value={1}');
    expect(home).not.toContain('value={12}');
  });
});
