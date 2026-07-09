import type { HouseReportSnapshot } from "@/src/modules/houses/services/getAdminHouseReports";

export type ReportPeriodFilterMode = "all" | "month" | "quarter" | "year";

export type ReportMonthPeriod = {
  year: number;
  month: string;
};

export type ReportQuarterPeriod = {
  year: number;
  quarter: number;
};

const MONTH_ORDER = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

const MONTH_INDEX = new Map(
  MONTH_ORDER.map((month, index) => [month, index]),
);

const MONTH_LABELS: Record<string, string> = {
  "01": "Січень",
  "02": "Лютий",
  "03": "Березень",
  "04": "Квітень",
  "05": "Травень",
  "06": "Червень",
  "07": "Липень",
  "08": "Серпень",
  "09": "Вересень",
  "10": "Жовтень",
  "11": "Листопад",
  "12": "Грудень",
};

const QUARTER_LABELS: Record<number, string> = {
  1: "I квартал",
  2: "II квартал",
  3: "III квартал",
  4: "IV квартал",
};

export function formatReportMonthValue(value: number | null | undefined) {
  return value ? String(value).padStart(2, "0") : null;
}

export function getHouseReportMonthLabel(value: string) {
  return MONTH_LABELS[value] ?? value;
}

export function getHouseReportQuarterLabel(value: number) {
  return QUARTER_LABELS[value] ?? `${value} квартал`;
}

export function getHouseReportPeriodLabel(report: HouseReportSnapshot) {
  if (report.periodKind === "month" && report.periodMonth && report.periodYear) {
    return `${getHouseReportMonthLabel(formatReportMonthValue(report.periodMonth) ?? "")} ${report.periodYear}`;
  }

  if (report.periodKind === "quarter" && report.periodQuarter && report.periodYear) {
    return `${getHouseReportQuarterLabel(report.periodQuarter)} ${report.periodYear}`;
  }

  if (report.periodKind === "year" && report.periodYear) {
    return String(report.periodYear);
  }

  return "Без періоду";
}

export function getHouseReportPeriodSortKey(report: HouseReportSnapshot) {
  if (!report.periodYear) {
    return -1;
  }

  if (report.periodKind === "year") {
    return report.periodYear * 100 + 13;
  }

  if (report.periodKind === "quarter" && report.periodQuarter) {
    return report.periodYear * 100 + report.periodQuarter * 3;
  }

  if (report.periodKind === "month" && report.periodMonth) {
    return report.periodYear * 100 + report.periodMonth;
  }

  return -1;
}

export function sortHouseReportSnapshots(reports: HouseReportSnapshot[]) {
  return [...reports].sort((left, right) => {
    const pinnedDiff =
      Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));

    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }

    const periodDiff =
      getHouseReportPeriodSortKey(right) - getHouseReportPeriodSortKey(left);

    if (periodDiff !== 0) {
      return periodDiff;
    }

    const leftDate =
      new Date(left.reportDate ?? left.publishedAt ?? left.updatedAt).getTime() ||
      0;
    const rightDate =
      new Date(right.reportDate ?? right.publishedAt ?? right.updatedAt).getTime() ||
      0;
    const dateDiff = rightDate - leftDate;

    if (dateDiff !== 0) {
      return dateDiff;
    }

    const sortOrderDiff = left.sortOrder - right.sortOrder;

    if (sortOrderDiff !== 0) {
      return sortOrderDiff;
    }

    return left.title.localeCompare(right.title, "uk", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function isCompleteMonthReport(report: HouseReportSnapshot) {
  return Boolean(
    report.periodKind === "month" &&
      report.periodMonth &&
      report.periodYear,
  );
}

export function isCompleteQuarterReport(report: HouseReportSnapshot) {
  return Boolean(
    report.periodKind === "quarter" &&
      report.periodQuarter &&
      report.periodYear,
  );
}

export function isCompleteYearReport(report: HouseReportSnapshot) {
  return Boolean(report.periodKind === "year" && report.periodYear);
}

export function getAvailableReportMonthPeriods(
  reports: HouseReportSnapshot[],
): ReportMonthPeriod[] {
  return Array.from(
    new Map(
      reports.filter(isCompleteMonthReport).map((item) => {
        const month = formatReportMonthValue(item.periodMonth);

        return [
          `${item.periodYear}-${month}`,
          {
            year: item.periodYear as number,
            month: month as string,
          },
        ];
      }),
    ).values(),
  ).sort((left, right) => {
    if (right.year !== left.year) return right.year - left.year;

    const leftIndex = MONTH_INDEX.get(left.month) ?? -1;
    const rightIndex = MONTH_INDEX.get(right.month) ?? -1;
    return rightIndex - leftIndex;
  });
}

export function getAvailableReportQuarterPeriods(
  reports: HouseReportSnapshot[],
): ReportQuarterPeriod[] {
  return Array.from(
    new Map(
      reports.filter(isCompleteQuarterReport).map((item) => [
        `${item.periodYear}-${item.periodQuarter}`,
        {
          year: item.periodYear as number,
          quarter: item.periodQuarter as number,
        },
      ]),
    ).values(),
  ).sort((left, right) => {
    if (right.year !== left.year) return right.year - left.year;
    return right.quarter - left.quarter;
  });
}

export function getAvailableReportYears(reports: HouseReportSnapshot[]) {
  return Array.from(
    new Set(
      reports
        .filter(isCompleteYearReport)
        .map((item) => item.periodYear)
        .filter((item): item is number => typeof item === "number"),
    ),
  ).sort((left, right) => right - left);
}

export function isReportPeriodFilterMode(
  value: unknown,
): value is ReportPeriodFilterMode {
  return value === "all" || value === "month" || value === "quarter" || value === "year";
}

export function resolveReportPeriodFilterMode(params: {
  period?: string;
  mode?: string;
}): ReportPeriodFilterMode {
  if (isReportPeriodFilterMode(params.period)) {
    return params.period;
  }

  if (params.mode === "current") {
    return "month";
  }

  if (params.mode === "past" || params.mode === "archive") {
    return "year";
  }

  return "all";
}

export function filterHouseReportsByPeriod(
  reports: HouseReportSnapshot[],
  filter: {
    mode: ReportPeriodFilterMode;
    monthPeriod?: ReportMonthPeriod | null;
    quarterPeriod?: ReportQuarterPeriod | null;
    year?: number | null;
  },
) {
  if (filter.mode === "month") {
    return reports.filter(
      (item) =>
        filter.monthPeriod &&
        isCompleteMonthReport(item) &&
        item.periodYear === filter.monthPeriod.year &&
        formatReportMonthValue(item.periodMonth) === filter.monthPeriod.month,
    );
  }

  if (filter.mode === "quarter") {
    return reports.filter(
      (item) =>
        filter.quarterPeriod &&
        isCompleteQuarterReport(item) &&
        item.periodYear === filter.quarterPeriod.year &&
        item.periodQuarter === filter.quarterPeriod.quarter,
    );
  }

  if (filter.mode === "year") {
    return reports.filter(
      (item) =>
        filter.year &&
        isCompleteYearReport(item) &&
        item.periodYear === filter.year,
    );
  }

  return reports;
}
