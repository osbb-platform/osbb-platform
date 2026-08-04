import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("site CMS consumers", () => {
  const cmsServiceImport = "@/src/modules/site/services/getSiteCmsContent";

  it("connects the site layout and home page to CMS content", () => {
    const layout = read("app/(site)/layout.tsx");
    const home = read("app/(site)/page.tsx");

    expect(layout).toContain(cmsServiceImport);
    expect(layout).toContain("const { settings } = await getSiteCmsContent()");
    expect(layout).toContain("name: settings.organizationName");
    expect(layout).toContain("email: settings.email");
    expect(layout).toContain("telephone: settings.primaryPhone");

    expect(home).toContain(cmsServiceImport);
    expect(home).toContain("await getSiteCmsContent();");
    expect(home).toContain("settings: siteSettings");
    expect(home).toContain("cities: siteCities");
    expect(home).toContain("testimonials: siteTestimonials");
  });

  it("connects public city surfaces to CMS content", () => {
    const findHouse = read("app/(site)/znayty-budynok/page.tsx");
    const kyiv = read("app/(site)/kyiv/page.tsx");
    const odesa = read("app/(site)/odesa/page.tsx");

    expect(findHouse).toContain(cmsServiceImport);
    expect(findHouse).toContain("const { cities } = await getSiteCmsContent()");
    expect(findHouse).toContain("{cities.map((city) => (");

    for (const cityPage of [kyiv, odesa]) {
      expect(cityPage).toContain(cmsServiceImport);
      expect(cityPage).toContain(
        "const { cities } = await getSiteCmsContent()",
      );
      expect(cityPage).toContain("cities.find(");
      expect(cityPage).toContain("getSiteCity(");
    }
  });

  it("connects blog index, detail and metadata to CMS posts", () => {
    const blog = read("app/(site)/blog/page.tsx");
    const post = read("app/(site)/blog/[slug]/page.tsx");

    expect(blog).toContain(cmsServiceImport);
    expect(blog).toContain("const { posts } = await getSiteCmsContent()");
    expect(blog).not.toContain(
      'import { sitePosts } from "@/src/modules/site/data/siteContent"',
    );

    expect(post).toContain(cmsServiceImport);
    expect(
      post.match(/const \{ posts \} = await getSiteCmsContent\(\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(post).toContain("posts.find((item) => item.slug === slug)");
    expect(post).toContain("const relatedPosts = posts");

    // Static fallback parameters remain available during build.
    expect(post).toContain(
      'import { sitePosts } from "@/src/modules/site/data/siteContent"',
    );
    expect(post).toContain("return sitePosts.map((post) => ({");
  });

  it("connects the release timeline to CMS content", () => {
    const releases = read("app/(site)/onovlennya/page.tsx");

    expect(releases).toContain(cmsServiceImport);
    expect(releases).toContain(
      "const { releases } = await getSiteCmsContent()",
    );
    expect(releases).toContain("const released = releases.filter(");
    expect(releases).toContain("const planned = releases.filter(");
    expect(releases).not.toContain(
      'import { siteReleases } from "@/src/modules/site/data/siteContent"',
    );
  });

  it("keeps all CMS reads server-side", () => {
    for (const relativePath of [
      "app/(site)/layout.tsx",
      "app/(site)/page.tsx",
      "app/(site)/znayty-budynok/page.tsx",
      "app/(site)/blog/page.tsx",
      "app/(site)/blog/[slug]/page.tsx",
      "app/(site)/onovlennya/page.tsx",
      "app/(site)/kyiv/page.tsx",
      "app/(site)/odesa/page.tsx",
    ]) {
      const source = read(relativePath);

      expect(source).not.toContain('"use client"');
      expect(source).not.toContain("'use client'");
      expect(source).not.toContain("createSupabasePublicClient");
    }
  });
});
