import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

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

describe("site A1 route skeleton", () => {
  it("contains every approved site route", () => {
    for (const file of sitePages) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
    }
  });

  it("removes legacy root route entries from the live app tree", () => {
    expect(fs.existsSync(path.join(root, "app/(public)/page.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(root, "app/(public)/[slug]/page.tsx"))).toBe(
      false,
    );
  });

  it("keeps house and admin route infrastructure intact", () => {
    expect(
      fs.existsSync(path.join(root, "app/(public)/house/[slug]/layout.tsx")),
    ).toBe(true);

    expect(fs.existsSync(path.join(root, "app/(admin)/admin"))).toBe(true);
    expect(fs.existsSync(path.join(root, "proxy.ts"))).toBe(true);
  });

  it("centralizes site content and supports site-only noindex", () => {
    const layout = fs.readFileSync(
      path.join(root, "app/(site)/layout.tsx"),
      "utf8",
    );
    const content = fs.readFileSync(
      path.join(root, "src/modules/site/data/siteContent.ts"),
      "utf8",
    );

    expect(layout).toContain("process.env.SITE_NOINDEX");
    expect(content).toContain("siteSettings");
    expect(content).toContain("siteCities");
    expect(content).toContain("siteTestimonials");
    expect(content).toContain("siteReleases");
    expect(content).toContain("sitePosts");
  });

  it("does not modify proxy routing to house or admin subdomains", () => {
    const proxy = fs.readFileSync(path.join(root, "proxy.ts"), "utf8");

    expect(proxy).toContain('if (subdomain === "admin")');
    expect(proxy).toContain("if (!RESERVED_SUBDOMAINS.has(subdomain))");
    expect(proxy).toContain("`/house/${subdomain}`");
  });
});
