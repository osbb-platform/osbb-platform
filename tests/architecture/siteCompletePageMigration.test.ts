import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const sitePages = [
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
] as const;

describe("site A3 complete HTML migration", () => {
  it("removes the temporary route placeholder implementation", () => {
    expect(
      fs.existsSync(
        path.join(root, "src/modules/site/components/SiteRoutePlaceholder.tsx"),
      ),
    ).toBe(false);

    for (const page of sitePages) {
      expect(read(page)).not.toContain("SiteRoutePlaceholder");
    }
  });

  it("preserves all fifteen approved site routes", () => {
    for (const page of sitePages) {
      expect(fs.existsSync(path.join(root, page)), page).toBe(true);
    }
  });

  it("uses centralized CMS blog and release content", () => {
    const blog = read("app/(site)/blog/page.tsx");
    const article = read("app/(site)/blog/[slug]/page.tsx");
    const releases = read("app/(site)/onovlennya/page.tsx");

    const cmsServiceImport = "@/src/modules/site/services/getSiteCmsContent";

    expect(blog).toContain(cmsServiceImport);
    expect(blog).toContain("const { posts } = await getSiteCmsContent()");

    expect(article).toContain(cmsServiceImport);
    expect(article).toContain("const { posts } = await getSiteCmsContent()");
    expect(article).toContain("posts.find((item) => item.slug === slug)");

    // Build-time route generation keeps the approved static fallback.
    expect(article).toContain("generateStaticParams");
    expect(article).toContain(
      'import { sitePosts } from "@/src/modules/site/data/siteContent"',
    );
    expect(article).toContain("return sitePosts.map((post) => ({");

    expect(releases).toContain(cmsServiceImport);
    expect(releases).toContain(
      "const { releases } = await getSiteCmsContent()",
    );

    expect(blog).not.toContain(
      'import { sitePosts } from "@/src/modules/site/data/siteContent"',
    );
    expect(releases).not.toContain(
      'import { siteReleases } from "@/src/modules/site/data/siteContent"',
    );
  });

  it("uses centralized contact and legal values", () => {
    const contacts = read("app/(site)/kontakty/page.tsx");
    const privacy = read("app/(site)/polityka-konfidentsiynosti/page.tsx");

    expect(contacts).toContain("siteSettings.primaryPhone");
    expect(contacts).toContain("siteSettings.email");
    expect(privacy).toContain("siteSettings.legalName");
    expect(privacy).toContain("siteSettings.workingHours");

    expect(contacts).not.toContain("+38 (067) 512-84-30");
    expect(privacy).not.toContain("hello@osbb-platform.com.ua");
  });

  it("keeps prohibited real-house references out of the entire site", () => {
    const siteSources = [
      path.join(root, "app/(site)"),
      path.join(root, "src/modules/site"),
    ];

    const files: string[] = [];

    function walk(directory: string) {
      for (const entry of fs.readdirSync(directory, {
        withFileTypes: true,
      })) {
        const absolute = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          walk(absolute);
        } else if (
          entry.name.endsWith(".ts") ||
          entry.name.endsWith(".tsx") ||
          entry.name.endsWith(".css")
        ) {
          files.push(absolute);
        }
      }
    }

    for (const directory of siteSources) {
      walk(directory);
    }

    const source = files
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toContain("osbb-ekspres-4");
    expect(source).not.toContain("224466");
  });
});
