import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("approved cabinet previews", () => {
  it("uses exact previews only for the four approved sections", () => {
    const component = read(
      "src/modules/site/components/blocks/ApprovedCabinetPreview.tsx",
    );
    const theme = read("app/(site)/site-theme.css");

    expect(component).toContain('"home"');
    expect(component).toContain('"announcements"');
    expect(component).toContain('"reports"');
    expect(component).toContain('"plan"');

    expect(component).toContain("ОСББ «Експрес-4»");
    expect(component).toContain("demo.osbb-platform.com.ua");
    expect(component).not.toContain("osbb-ekspres-4.osbb-platform.com.ua");

    expect(theme).toContain("#16a34a");
    expect(theme).toContain(".osbb-real-preview");
  });

  it("does not use the old universal mockup on capabilities", () => {
    const page = read("app/(site)/mozhlyvosti/page.tsx");

    expect(page).not.toContain("cabinetMockups");
    expect(page).not.toContain("requireMockup");
    expect(page).not.toContain("mockup=");
    expect(page).toContain("visual={section.id}");
  });

  it("uses line-icon treatment for the other eight sections", () => {
    const icon = read("src/modules/site/components/blocks/FeatureLineIcon.tsx");

    for (const id of [
      "information",
      "meetings",
      "debtors",
      "board",
      "specialists",
      "requisites",
      "documents",
      "polls",
    ]) {
      expect(icon).toContain(id);
    }
  });
});
