import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("site A3 shared component library", () => {
  it("renders the shared header and footer from the site layout", () => {
    const layout = read("app/(site)/layout.tsx");

    expect(layout).toContain("<SiteHeader />");
    expect(layout).toContain("<SiteFooter />");

    expect(layout).not.toContain("<header");
    expect(layout).not.toContain("<footer");
  });

  it("keeps contact values outside layout components", () => {
    const footer = read(
      "src/modules/site/components/layout/SiteFooter.tsx",
    );
    const header = read(
      "src/modules/site/components/layout/SiteHeader.tsx",
    );

    expect(footer).toContain("siteSettings.primaryPhone");
    expect(footer).toContain("siteSettings.secondaryPhone");
    expect(footer).toContain("siteSettings.email");

    expect(footer).not.toContain("+38 (067)");
    expect(footer).not.toContain("hello@osbb-platform.com.ua");
    expect(header).not.toContain("+38 (067)");
  });

  it("provides the approved shared primitives", () => {
    const requiredFiles = [
      "src/modules/site/components/layout/SiteHeader.tsx",
      "src/modules/site/components/layout/SiteFooter.tsx",
      "src/modules/site/components/layout/Breadcrumbs.tsx",
      "src/modules/site/components/ui/Eyebrow.tsx",
      "src/modules/site/components/ui/Section.tsx",
      "src/modules/site/components/ui/Card.tsx",
      "src/modules/site/components/ui/StatFigure.tsx",
      "src/modules/site/components/ui/StatusBadge.tsx",
      "src/modules/site/components/ui/QuoteBlock.tsx",
      "src/modules/site/components/ui/CodeCells.tsx",
      "src/modules/site/components/seo/JsonLd.tsx",
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
    }
  });

  it("uses one header and one footer implementation", () => {
    const sourceFiles = fs
      .readdirSync(path.join(root, "app/(site)"), {
        recursive: true,
        withFileTypes: true,
      })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"));

    expect(sourceFiles.length).toBeGreaterThan(0);

    const pages = [
      "app/(site)/page.tsx",
      "app/(site)/mozhlyvosti/page.tsx",
      "app/(site)/yak-tse-pratsyuye/page.tsx",
      "app/(site)/vartist/page.tsx",
      "app/(site)/bilshe-nizh-platforma/page.tsx",
      "app/(site)/demo/page.tsx",
      "app/(site)/znayty-budynok/page.tsx",
      "app/(site)/meshkantsyam/page.tsx",
      "app/(site)/kyiv/page.tsx",
      "app/(site)/odesa/page.tsx",
      "app/(site)/blog/page.tsx",
      "app/(site)/blog/[slug]/page.tsx",
      "app/(site)/onovlennya/page.tsx",
      "app/(site)/kontakty/page.tsx",
      "app/(site)/polityka-konfidentsiynosti/page.tsx",
    ];

    for (const page of pages) {
      const content = read(page);

      expect(content).not.toContain("<SiteHeader");
      expect(content).not.toContain("<SiteFooter");
      expect(content).not.toContain(
        'components/layout/SiteHeader',
      );
      expect(content).not.toContain(
        'components/layout/SiteFooter',
      );
    }
  });

  it("does not hardcode prohibited house references", () => {
    const componentRoot = path.join(root, "src/modules/site/components");
    const files: string[] = [];

    function walk(directory: string) {
      for (const entry of fs.readdirSync(directory, {
        withFileTypes: true,
      })) {
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          walk(absolutePath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          files.push(absolutePath);
        }
      }
    }

    walk(componentRoot);

    const source = files
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toContain("osbb-ekspres-4");
    expect(source).not.toContain("224466");
  });
});
