import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const generator = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/services/generateHouseAnnouncementPdf.ts",
  ),
  "utf8",
);

const route = readFileSync(
  join(process.cwd(), "app/api/reports/view/route.ts"),
  "utf8",
);

const regeneration = readFileSync(
  join(process.cwd(), "scripts/regenerate-house-announcements.mjs"),
  "utf8",
);

describe("house poster PDF reliability", () => {
  it("uses serverless Chromium without a Vercel skip", () => {
    expect(generator).toContain("@sparticuz/chromium");
    expect(generator).toContain("puppeteer-core");
    expect(generator).toContain("await chromium.executablePath()");
    expect(generator).not.toContain('await import("puppeteer")');
    expect(generator).not.toContain('from "puppeteer";');
    expect(generator).not.toContain("ALLOW_LOCAL_PDF_GENERATION");
    expect(generator).not.toContain(
      "Puppeteer не работает в Vercel serverless",
    );
  });

  it("keeps the shared current template as the regeneration source", () => {
    expect(regeneration).toContain("getHouseAnnouncementHtml");
    expect(regeneration).not.toContain("<!DOCTYPE html>");
  });

  it("streams authorized PDF bytes instead of redirecting the iframe", () => {
    expect(route).toContain("resolveSignedFileUrl");
    expect(route).toContain("await fetch(result.signedUrl");
    expect(route).toContain('"Content-Disposition"');
    expect(route).toContain('"Accept-Ranges"');
    expect(route).not.toContain("NextResponse.redirect");
  });

  it("prevents caching of private signed PDF responses", () => {
    expect(route).toContain("private, no-store, max-age=0, must-revalidate");
    expect(route).toContain('cache: "no-store"');
  });
});
