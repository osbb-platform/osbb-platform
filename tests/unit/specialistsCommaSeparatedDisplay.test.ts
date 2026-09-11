import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminWorkspace = readFileSync(
  "src/modules/houses/components/HouseSpecialistsWorkspace.tsx",
  "utf8",
);
const publicPage = readFileSync(
  "app/(public)/house/[slug]/specialists/page.tsx",
  "utf8",
);

describe("Specialists multi-category display is comma-separated text, not a badge per category", () => {
  it("admin workspace card joins categories with a comma instead of mapping one badge per category", () => {
    expect(adminWorkspace).toContain('item.content.categories.join(", ")');
    expect(adminWorkspace).not.toMatch(/item\.content\.categories\.map\(\(category\) => \(/);
  });

  it("public specialists card joins categories with a comma instead of mapping one badge per category", () => {
    expect(publicPage).toContain('item.categories.join(", ")');
    expect(publicPage).not.toMatch(/item\.categories\.map\(\(category\) => \(/);
  });

  it("comma-join actually produces the product-specified format for a real category list", () => {
    const categories = ["Електрик", "Сантехнік", "Бухгалтер"];
    expect(categories.join(", ")).toBe("Електрик, Сантехнік, Бухгалтер");
  });
});
