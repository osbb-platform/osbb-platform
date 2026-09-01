import type { HouseReportSnapshot } from "@/src/modules/houses/services/getAdminHouseReports";

export type AdminReportPeriodKind =
  | "month"
  | "quarter"
  | "year";

export type AdminReportNavigationFilter =
  | {
      mode: "none";
    }
  | {
      mode: "period";
      year: number;
      kind: AdminReportPeriodKind;
      month?: number | null;
      quarter?: number | null;
    };

export function getAdminReportPeriodYear(
  report: HouseReportSnapshot,
): number | null {
  return typeof report.periodYear === "number" &&
    Number.isInteger(report.periodYear)
    ? report.periodYear
    : null;
}

export function getAdminReportYears(
  reports: readonly HouseReportSnapshot[],
): number[] {
  return Array.from(
    new Set(
      reports
        .filter((report) => report.periodKind !== "none")
        .map(getAdminReportPeriodYear)
        .filter(
          (year): year is number =>
            typeof year === "number",
        ),
    ),
  ).sort((left, right) => right - left);
}

export function filterAdminReportsByNavigation(
  reports: readonly HouseReportSnapshot[],
  filter: AdminReportNavigationFilter,
): HouseReportSnapshot[] {
  if (filter.mode === "none") {
    return reports.filter(
      (report) => report.periodKind === "none",
    );
  }

  return reports.filter((report) => {
    if (report.periodKind !== filter.kind) return false;
    if (getAdminReportPeriodYear(report) !== filter.year) {
      return false;
    }

    if (
      filter.kind === "month" &&
      typeof filter.month === "number"
    ) {
      return report.periodMonth === filter.month;
    }

    if (
      filter.kind === "quarter" &&
      typeof filter.quarter === "number"
    ) {
      return report.periodQuarter === filter.quarter;
    }

    return true;
  });
}

export function countAdminReportsByKind(
  reports: readonly HouseReportSnapshot[],
  year: number,
): Record<AdminReportPeriodKind, number> {
  return {
    month: reports.filter(
      (report) =>
        report.periodKind === "month" &&
        getAdminReportPeriodYear(report) === year,
    ).length,
    quarter: reports.filter(
      (report) =>
        report.periodKind === "quarter" &&
        getAdminReportPeriodYear(report) === year,
    ).length,
    year: reports.filter(
      (report) =>
        report.periodKind === "year" &&
        getAdminReportPeriodYear(report) === year,
    ).length,
  };
}
