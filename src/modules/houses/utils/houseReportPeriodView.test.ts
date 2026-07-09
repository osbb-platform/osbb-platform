import { describe, expect, it } from "vitest";

import type { HouseReportSnapshot } from "@/src/modules/houses/services/getAdminHouseReports";
import {
  filterHouseReportsByPeriod,
  formatReportMonthValue,
  getAvailableReportMonthPeriods,
  getAvailableReportQuarterPeriods,
  getAvailableReportYears,
  getHouseReportPeriodLabel,
  getHouseReportPeriodSortKey,
  resolveReportPeriodFilterMode,
  sortHouseReportSnapshots,
} from "./houseReportPeriodView";

function report(
  overrides: Partial<HouseReportSnapshot> & Pick<HouseReportSnapshot, "id" | "title">,
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

describe("house report period view helpers", () => {
  it("builds normalized period sort keys with year after Q4", () => {
    expect(
      getHouseReportPeriodSortKey(
        report({
          id: "year-2026",
          title: "2026",
          periodKind: "year",
          periodYear: 2026,
        }),
      ),
    ).toBe(202613);

    expect(
      getHouseReportPeriodSortKey(
        report({
          id: "q4-2026",
          title: "Q4",
          periodKind: "quarter",
          periodQuarter: 4,
          periodYear: 2026,
        }),
      ),
    ).toBe(202612);

    expect(
      getHouseReportPeriodSortKey(
        report({
          id: "dec-2026",
          title: "December",
          periodKind: "month",
          periodMonth: 12,
          periodYear: 2026,
        }),
      ),
    ).toBe(202612);

    expect(
      getHouseReportPeriodSortKey(
        report({
          id: "none",
          title: "None",
          periodKind: "none",
        }),
      ),
    ).toBe(-1);
  });

  it("sorts pinned first, then normalized period key desc, then none at the end", () => {
    const sorted = sortHouseReportSnapshots([
      report({ id: "none", title: "None", periodKind: "none" }),
      report({
        id: "q4-2026",
        title: "Q4 2026",
        periodKind: "quarter",
        periodQuarter: 4,
        periodYear: 2026,
      }),
      report({
        id: "year-2026",
        title: "Year 2026",
        periodKind: "year",
        periodYear: 2026,
      }),
      report({
        id: "month-2026-01",
        title: "Jan 2026",
        periodKind: "month",
        periodMonth: 1,
        periodYear: 2026,
      }),
      report({
        id: "pinned-none",
        title: "Pinned none",
        periodKind: "none",
        isPinned: true,
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "pinned-none",
      "year-2026",
      "q4-2026",
      "month-2026-01",
      "none",
    ]);
  });

  it("resolves legacy public filter modes for backwards-compatible URLs", () => {
    expect(resolveReportPeriodFilterMode({ period: "quarter" })).toBe("quarter");
    expect(resolveReportPeriodFilterMode({ mode: "current" })).toBe("month");
    expect(resolveReportPeriodFilterMode({ mode: "past" })).toBe("year");
    expect(resolveReportPeriodFilterMode({ mode: "archive" })).toBe("year");
    expect(resolveReportPeriodFilterMode({ period: "invalid" })).toBe("all");
  });

  it("builds available period value lists in descending order", () => {
    const reports = [
      report({
        id: "m-2025-12",
        title: "Dec 2025",
        periodKind: "month",
        periodMonth: 12,
        periodYear: 2025,
      }),
      report({
        id: "m-2026-01",
        title: "Jan 2026",
        periodKind: "month",
        periodMonth: 1,
        periodYear: 2026,
      }),
      report({
        id: "q2-2026",
        title: "Q2 2026",
        periodKind: "quarter",
        periodQuarter: 2,
        periodYear: 2026,
      }),
      report({
        id: "q4-2026",
        title: "Q4 2026",
        periodKind: "quarter",
        periodQuarter: 4,
        periodYear: 2026,
      }),
      report({
        id: "year-2024",
        title: "Year 2024",
        periodKind: "year",
        periodYear: 2024,
      }),
      report({
        id: "year-2026",
        title: "Year 2026",
        periodKind: "year",
        periodYear: 2026,
      }),
    ];

    expect(getAvailableReportMonthPeriods(reports)).toEqual([
      { year: 2026, month: "01" },
      { year: 2025, month: "12" },
    ]);
    expect(getAvailableReportQuarterPeriods(reports)).toEqual([
      { year: 2026, quarter: 4 },
      { year: 2026, quarter: 2 },
    ]);
    expect(getAvailableReportYears(reports)).toEqual([2026, 2024]);
  });

  it("filters none reports only in all mode", () => {
    const reports = sortHouseReportSnapshots([
      report({
        id: "month",
        title: "Month",
        periodKind: "month",
        periodMonth: 5,
        periodYear: 2026,
      }),
      report({
        id: "quarter",
        title: "Quarter",
        periodKind: "quarter",
        periodQuarter: 2,
        periodYear: 2026,
      }),
      report({
        id: "year",
        title: "Year",
        periodKind: "year",
        periodYear: 2026,
      }),
      report({
        id: "none",
        title: "None",
        periodKind: "none",
      }),
    ]);

    expect(
      filterHouseReportsByPeriod(reports, {
        mode: "all",
      }).map((item) => item.id),
    ).toContain("none");

    expect(
      filterHouseReportsByPeriod(reports, {
        mode: "month",
        monthPeriod: { year: 2026, month: "05" },
      }).map((item) => item.id),
    ).toEqual(["month"]);

    expect(
      filterHouseReportsByPeriod(reports, {
        mode: "quarter",
        quarterPeriod: { year: 2026, quarter: 2 },
      }).map((item) => item.id),
    ).toEqual(["quarter"]);

    expect(
      filterHouseReportsByPeriod(reports, {
        mode: "year",
        year: 2026,
      }).map((item) => item.id),
    ).toEqual(["year"]);
  });

  it("formats labels for all period kinds", () => {
    expect(formatReportMonthValue(3)).toBe("03");
    expect(
      getHouseReportPeriodLabel(
        report({
          id: "month",
          title: "Month",
          periodKind: "month",
          periodMonth: 3,
          periodYear: 2026,
        }),
      ),
    ).toBe("Березень 2026");

    expect(
      getHouseReportPeriodLabel(
        report({
          id: "quarter",
          title: "Quarter",
          periodKind: "quarter",
          periodQuarter: 4,
          periodYear: 2026,
        }),
      ),
    ).toBe("IV квартал 2026");

    expect(
      getHouseReportPeriodLabel(
        report({
          id: "year",
          title: "Year",
          periodKind: "year",
          periodYear: 2026,
        }),
      ),
    ).toBe("2026");

    expect(
      getHouseReportPeriodLabel(
        report({
          id: "none",
          title: "None",
          periodKind: "none",
        }),
      ),
    ).toBe("Без періоду");
  });
});
