import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const footer = fs.readFileSync(
  path.join(
    root,
    "src/modules/houses/components/PublicHouseFooter.tsx",
  ),
  "utf8",
);

describe("U1-T2 public house footer hardening", () => {
  it("uses companyLogoAlt only as image alt", () => {
    expect(footer).toContain(
      "alt={houseCopy.footer.companyLogoAlt}",
    );

    const allOccurrences = footer.match(
      /\{houseCopy\.footer\.companyLogoAlt\}/g,
    );

    expect(allOccurrences ?? []).toHaveLength(1);

    const withoutImageAlt = footer.replace(
      "alt={houseCopy.footer.companyLogoAlt}",
      "",
    );

    expect(withoutImageAlt).not.toContain(
      "{houseCopy.footer.companyLogoAlt}",
    );
  });

  it("never uses raw company placeholder literals as fallbacks", () => {
    for (const placeholder of [
      "{companySlogan}",
      "{companyName}",
      "{companyPhone}",
      "{companyEmail}",
      "{companyAddress}",
    ]) {
      expect(footer).not.toContain(`"${placeholder}"`);
    }
  });

  it("hides optional company fields instead of rendering empty values", () => {
    expect(footer).toContain("companyName ? (");
    expect(footer).toContain("companySlogan ? (");
    expect(footer).toContain("companyPhone ? (");
    expect(footer).toContain("companyEmail ? (");
    expect(footer).toContain("companyAddress ? (");
  });

  it("does not hardcode the target slogan in React", () => {
    expect(footer).not.toContain(
      "Сучасні технології в бухгалтерії — облік, якому можна довіряти.",
    );
  });
});
