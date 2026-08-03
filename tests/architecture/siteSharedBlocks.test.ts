import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("site A3 shared blocks", () => {
  it("provides one shared CTA and one lead form", () => {
    const cta = read("src/modules/site/components/blocks/CtaBlock.tsx");

    expect(cta).toContain("<LeadForm />");
    expect(cta).toContain('id="zayavka"');
  });

  it("keeps the C1 lead action inside the site module boundary", () => {
    const siteRoot = path.join(root, "src/modules/site");
    const actionPath = path.join(
      siteRoot,
      "actions",
      "submitSiteLead.ts",
    );

    expect(fs.existsSync(actionPath)).toBe(true);

    const source = fs.readFileSync(actionPath, "utf8");

    expect(source).toContain('"use server"');
    expect(source).toContain(
      "export async function submitSiteLead",
    );
    expect(source).toContain("createSupabaseAdminClient");
    expect(source).not.toContain("createSupabaseServerClient");
  });

  it("keeps all cabinet demonstrations in mockupData", () => {
    const data = read("src/modules/site/data/mockupData.ts");
    const component = read(
      "src/modules/site/components/blocks/CabinetMockup.tsx",
    );

    expect(data).toContain("cabinetMockups");
    expect(data).toContain('id: "announcements"');
    expect(data).toContain('id: "polls"');
    expect(data).toContain('id: "home"');

    expect(component).toContain("data.rows.map");
    expect(component).not.toContain("Планове відключення води");
  });

  it("provides all required shared blocks for A3", () => {
    const files = [
      "src/modules/site/components/ui/Accordion.tsx",
      "src/modules/site/components/blocks/LeadForm.tsx",
      "src/modules/site/components/blocks/CtaBlock.tsx",
      "src/modules/site/components/blocks/CabinetMockup.tsx",
      "src/modules/site/components/blocks/CityCards.tsx",
      "src/modules/site/components/blocks/Testimonials.tsx",
      "src/modules/site/components/blocks/HouseSearch.tsx",
      "src/modules/site/data/mockupData.ts",
    ];

    for (const file of files) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
    }
  });

  it("keeps contacts and prototype figures out of block markup", () => {
    const blocksRoot = path.join(root, "src/modules/site/components/blocks");
    const files = fs
      .readdirSync(blocksRoot)
      .filter((file) => file.endsWith(".tsx"));

    const source = files
      .map((file) => fs.readFileSync(path.join(blocksRoot, file), "utf8"))
      .join("\n");

    expect(source).not.toContain("+38 (067) 512-84-30");
    expect(source).not.toContain("hello@osbb-platform.com.ua");
    expect(source).not.toContain("250 будинків");
  });
});
