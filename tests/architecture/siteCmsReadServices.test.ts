import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const servicePath = path.join(
  process.cwd(),
  "src/modules/site/services/getSiteCmsContent.ts",
);

const source = fs.readFileSync(servicePath, "utf8");

describe("site CMS public read services", () => {
  it("uses the anonymous public Supabase client", () => {
    expect(source).toContain("import { createSupabasePublicClient }");
    expect(source).toContain("const supabase = createSupabasePublicClient()");
    expect(source).not.toContain("createSupabaseAdminClient");
    expect(source).not.toContain("createSupabaseServerClient");
  });

  it("reads every B2 CMS resource", () => {
    for (const table of [
      "site_settings",
      "site_cities",
      "site_testimonials",
      "site_post_categories",
      "site_posts",
      "site_releases",
    ]) {
      expect(source).toContain(`.from("${table}")`);
    }
  });

  it("keeps unpublished CMS content outside public queries", () => {
    expect(source).toContain('.eq("is_visible", true)');
    expect(source).toContain('.eq("is_published", true)');
    expect(source).toContain('.eq("status", "published")');
    expect(source).toContain('.lte("published_at", now)');
  });

  it("falls back to approved static content", () => {
    expect(source).toContain("settings: siteSettings");
    expect(source).toContain("cities: [...siteCities]");
    expect(source).toContain("testimonials: [...siteTestimonials]");
    expect(source).toContain("posts: [...sitePosts]");
    expect(source).toContain("releases: [...siteReleases]");
  });

  it("does not turn query failures into a false empty site", () => {
    expect(source).toContain("SITE_CMS_READ_FAILED");
    expect(source).toContain("SITE_CMS_INITIALIZATION_FAILED");

    expect(source).toContain("mapped.length > 0 ? mapped : [...siteCities]");
    expect(source).toContain(
      "mapped.length > 0 ? mapped : [...siteTestimonials]",
    );
    expect(source).toContain("mapped.length > 0 ? mapped : [...sitePosts]");
    expect(source).toContain("mapped.length > 0 ? mapped : [...siteReleases]");
  });

  it("uses tagged incremental cache invalidation", () => {
    expect(source).toContain('["site-cms-content-v1"]');
    expect(source).toContain('"site:content"');
    expect(source).toContain('"site:settings"');
    expect(source).toContain('"site:cities"');
    expect(source).toContain('"site:testimonials"');
    expect(source).toContain('"site:posts"');
    expect(source).toContain('"site:releases"');
    expect(source).toContain("revalidate: SITE_CMS_REVALIDATE_SECONDS");
  });
});
