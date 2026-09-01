import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { HouseReportSnapshot } from "../../src/modules/houses/services/getAdminHouseReports";
import {
  filterAdminReportsByNavigation,
  getAdminReportPeriodYear,
  getAdminReportYears,
} from "../../src/modules/houses/utils/adminReportNavigation";

function report(
  overrides: Partial<HouseReportSnapshot> &
    Pick<HouseReportSnapshot, "id" | "title">,
): HouseReportSnapshot {
  const { id, title, ...rest } = overrides;

  return {
    id,
    houseId: "house-1",
    title,
    description: "",
    categoryId: null,
    categoryTitle: "Фінансовий звіт",
    reportDate: null,
    periodType: "current",
    month: null,
    year: null,
    periodKind: "none",
    periodMonth: null,
    periodQuarter: null,
    periodYear: null,
    isPinned: false,
    isNew: false,
    newUntil: null,
    lifecycleStatus: "published",
    lockVersion: 1,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    createdBy: null,
    pdf: null,
    ...rest,
  };
}

const reports = [
  report({
    id: "jan-2026",
    title: "Січень 2026",
    periodType: "past",
    year: 1999,
    periodKind: "month",
    periodMonth: 1,
    periodYear: 2026,
  }),
  report({
    id: "oct-2026",
    title: "Жовтень 2026",
    periodKind: "month",
    periodMonth: 10,
    periodYear: 2026,
  }),
  report({
    id: "q1-2026",
    title: "I квартал 2026",
    periodKind: "quarter",
    periodQuarter: 1,
    periodYear: 2026,
  }),
  report({
    id: "q4-2026",
    title: "IV квартал 2026",
    periodKind: "quarter",
    periodQuarter: 4,
    periodYear: 2026,
  }),
  report({
    id: "annual-2026",
    title: "Річний 2026",
    periodType: "past",
    periodKind: "year",
    periodYear: 2026,
  }),
  report({
    id: "annual-2025",
    title: "Річний 2025",
    periodType: "current",
    periodKind: "year",
    periodYear: 2025,
  }),
  report({
    id: "none",
    title: "Без періоду",
    periodType: "current",
    periodKind: "none",
  }),
];

describe("U1-T5 Reports admin navigation", () => {
  it("builds level-1 years from periodYear descending only", () => {
    expect(getAdminReportYears(reports)).toEqual([
      2026,
      2025,
    ]);

    expect(getAdminReportPeriodYear(reports[0])).toBe(2026);
  });

  it("keeps none outside year/kind navigation", () => {
    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "none",
      }).map((item) => item.id),
    ).toEqual(["none"]);

    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "period",
        year: 2026,
        kind: "month",
      }).map((item) => item.id),
    ).not.toContain("none");
  });

  it("filters month, quarter and annual by authoritative period fields", () => {
    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "period",
        year: 2026,
        kind: "month",
        month: 1,
      }).map((item) => item.id),
    ).toEqual(["jan-2026"]);

    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "period",
        year: 2026,
        kind: "quarter",
        quarter: 4,
      }).map((item) => item.id),
    ).toEqual(["q4-2026"]);

    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "period",
        year: 2026,
        kind: "year",
      }).map((item) => item.id),
    ).toEqual(["annual-2026"]);
  });

  it("does not reclassify navigation from legacy periodType or current date", () => {
    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "period",
        year: 2025,
        kind: "year",
      }).map((item) => item.id),
    ).toEqual(["annual-2025"]);

    expect(
      filterAdminReportsByNavigation(reports, {
        mode: "period",
        year: 2026,
        kind: "month",
      }).map((item) => item.id),
    ).toContain("jan-2026");
  });

  it("renders year -> kind -> month/quarter hierarchy and permanent none", () => {
    const workspace = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/components/HouseReportsWorkspace.tsx",
      ),
      "utf8",
    );

    expect(workspace).toContain("publishedReportYears.map");
    expect(workspace).toContain('"Місяці"');
    expect(workspace).toContain('"Квартали"');
    expect(workspace).toContain('"Річний"');
    expect(workspace).toContain("Без періоду ·");
    expect(workspace).toContain("CURRENT_MONTH_OPTIONS.map");
    expect(workspace).toContain("QUARTER_OPTIONS.map");
    expect(workspace).toContain(
      'useWorkspaceMemory("reports", "periodMonth", "all")',
    );
    expect(workspace).toContain(
      'useWorkspaceMemory("reports", "periodQuarter", "all")',
    );

    expect(workspace).not.toContain("Поточний рік");
    expect(workspace).not.toContain("Минулі роки");
    expect(workspace).not.toContain(
      'publishedReports.filter((item) => item.periodType === "current")',
    );
    expect(workspace).not.toContain(
      'publishedReports.filter((item) => item.periodType === "past")',
    );
  });

  it("uses periodYear for year_desc/year_asc", () => {
    const workspace = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/components/HouseReportsWorkspace.tsx",
      ),
      "utf8",
    );

    expect(workspace).toContain(
      "getAdminReportPeriodYear(right)",
    );
    expect(workspace).toContain(
      "getAdminReportPeriodYear(left)",
    );
    expect(workspace).not.toContain(
      "Number(right.year ?? 0) - Number(left.year ?? 0)",
    );
    expect(workspace).not.toContain(
      "Number(left.year ?? 0) - Number(right.year ?? 0)",
    );
  });

  it("keeps legacy period compatibility only for write payload/form mapping", () => {
    const workspace = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/houses/components/HouseReportsWorkspace.tsx",
      ),
      "utf8",
    );

    expect(workspace).toContain(
      "const legacyPeriodType = getLegacyPeriodType",
    );
    expect(workspace).toContain(
      "periodType: legacyPeriodType",
    );
  });
});
