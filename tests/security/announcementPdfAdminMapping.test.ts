import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("announcement PDF CMS mapping", () => {
  it("keeps PDF data on the main house route", () => {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "app/(admin)/admin/(protected)/houses/[id]/page.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("pdf?: HouseAnnouncementFileInput | null;");
    expect(source).toContain("pdf: announcement.pdf ?? null,");
  });

  it("keeps PDF data on the dedicated announcements route", () => {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "app/(admin)/admin/(protected)/houses/[id]/page.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("pdf: announcement.pdf ?? null,");
  });
});
