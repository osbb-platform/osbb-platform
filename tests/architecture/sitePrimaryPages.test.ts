import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const primaryPages = [
  "app/(site)/page.tsx",
  "app/(site)/mozhlyvosti/page.tsx",
  "app/(site)/yak-tse-pratsyuye/page.tsx",
  "app/(site)/vartist/page.tsx",
  "app/(site)/bilshe-nizh-platforma/page.tsx",
] as const;

describe("site A3 primary pages", () => {
  it("removes A1 placeholders from all migrated primary pages", () => {
    for (const page of primaryPages) {
      const source = read(page);

      expect(source).not.toContain("SiteRoutePlaceholder");
      expect(source).toContain('id="main"');
    }
  });

  it("preserves the prototype hero copy", () => {
    expect(read("app/(site)/page.tsx")).toContain(
      "Голова керує будинком. Рутину ведемо ми.",
    );

    expect(read("app/(site)/mozhlyvosti/page.tsx")).toContain(
      "Що бачить мешканець у кабінеті свого будинку",
    );

    expect(read("app/(site)/yak-tse-pratsyuye/page.tsx")).toContain(
      "Від першої розмови до готового кабінету",
    );

    expect(read("app/(site)/vartist/page.tsx")).toContain(
      "Модель проста і зрозуміла",
    );

    expect(read("app/(site)/bilshe-nizh-platforma/page.tsx")).toContain(
      "За технологією стоїть п’ятнадцять років практики",
    );
  });

  it("renders all twelve cabinet sections from centralized mockup data", () => {
    const capabilities = read("app/(site)/mozhlyvosti/page.tsx");
    const mockups = read("src/modules/site/data/mockupData.ts");

    expect(capabilities).toContain("sections.map");
    expect(capabilities).toContain("Розділ");

    const ids = [
      "home",
      "announcements",
      "information",
      "reports",
      "plan",
      "meetings",
      "debtors",
      "board",
      "specialists",
      "requisites",
      "documents",
      "polls",
    ];

    for (const id of ids) {
      expect(mockups).toContain(`id: "${id}"`);
    }
  });

  it("uses the shared CTA instead of duplicated forms", () => {
    for (const page of primaryPages) {
      const source = read(page);

      expect(source).toContain("<CtaBlock");
      expect(source).not.toContain("<form");
    }
  });

  it("does not include prohibited production house values", () => {
    const source = primaryPages.map(read).join("\n");

    expect(source).not.toContain("osbb-ekspres-4");
    expect(source).not.toContain("224466");
  });
});
