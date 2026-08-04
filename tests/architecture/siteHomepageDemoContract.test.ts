import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("site homepage demo contract", () => {
  it("uses the approved demo CTA", () => {
    const home = read("app/(site)/page.tsx");

    expect(home).toContain("Подивитись демо-кабінет");
  });

  it("derives the displayed demo address from CMS settings", () => {
    const home = read("app/(site)/page.tsx");

    expect(home).toContain(
      "getDemoHouseDisplayAddress(siteSettings.demoHouseUrl)",
    );
    expect(home).toContain("href={siteSettings.demoHouseUrl}");
    expect(home).toContain("code={siteSettings.demoHouseCode}");
    expect(home).not.toContain("<dd>demo.osbb-platform.com.ua</dd>");
  });

  it("does not expose the production demo access code", () => {
    const home = read("app/(site)/page.tsx");

    expect(home).not.toContain("224466");
  });
});
