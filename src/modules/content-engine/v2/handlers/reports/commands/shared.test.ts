import { describe, expect, it } from "vitest";

import {
  readHouseReportPeriod,
  toLegacyPeriodColumns,
  toPeriodColumns,
} from "./shared";

describe("house report period normalization", () => {
  it("normalizes explicit month periods", () => {
    const result = readHouseReportPeriod({
      period: {
        kind: "month",
        month: "02",
        year: "2026",
      },
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual({
        kind: "month",
        month: 2,
        year: 2026,
      });

      expect(toPeriodColumns(result.data)).toEqual({
        period_kind: "month",
        period_month: 2,
        period_quarter: null,
        period_year: 2026,
      });
    }
  });

  it("normalizes explicit quarter periods", () => {
    const result = readHouseReportPeriod({
      period: {
        kind: "quarter",
        quarter: "IV",
        year: 2026,
      },
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual({
        kind: "quarter",
        quarter: 4,
        year: 2026,
      });

      expect(toPeriodColumns(result.data)).toEqual({
        period_kind: "quarter",
        period_month: null,
        period_quarter: 4,
        period_year: 2026,
      });
    }
  });

  it("normalizes explicit year and none periods", () => {
    const yearResult = readHouseReportPeriod({
      period: {
        kind: "year",
        year: 2025,
      },
    });
    const noneResult = readHouseReportPeriod({
      period: {
        kind: "none",
      },
    });

    expect(yearResult.ok).toBe(true);
    expect(noneResult.ok).toBe(true);

    if (yearResult.ok) {
      expect(toPeriodColumns(yearResult.data)).toEqual({
        period_kind: "year",
        period_month: null,
        period_quarter: null,
        period_year: 2025,
      });
    }

    if (noneResult.ok) {
      expect(toPeriodColumns(noneResult.data)).toEqual({
        period_kind: "none",
        period_month: null,
        period_quarter: null,
        period_year: null,
      });
    }
  });

  it("rejects invalid explicit period shapes", () => {
    expect(
      readHouseReportPeriod({
        period: {
          kind: "month",
          month: 2,
        },
      }).ok,
    ).toBe(false);

    expect(
      readHouseReportPeriod({
        period: {
          kind: "month",
          month: 2,
          quarter: 1,
          year: 2026,
        },
      }).ok,
    ).toBe(false);

    expect(
      readHouseReportPeriod({
        period: {
          kind: "none",
          year: 2026,
        },
      }).ok,
    ).toBe(false);
  });

  it("accepts legacy month plus year payloads during transition", () => {
    const result = readHouseReportPeriod({
      periodType: "current",
      month: "03",
      year: 2026,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual({
        kind: "month",
        month: 3,
        year: 2026,
      });

      expect(toLegacyPeriodColumns({ periodType: "current", month: "03", year: 2026 }, result.data)).toEqual({
        period_type: "current",
        month: "03",
        year: 2026,
      });
    }
  });

  it("keeps incomplete legacy month-only payloads compatible without violating new shape", () => {
    const result = readHouseReportPeriod({
      periodType: "current",
      month: "05",
      year: null,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual({ kind: "none" });
      expect(toPeriodColumns(result.data)).toEqual({
        period_kind: "none",
        period_month: null,
        period_quarter: null,
        period_year: null,
      });
      expect(toLegacyPeriodColumns({ periodType: "current", month: "05", year: null }, result.data)).toEqual({
        period_type: "current",
        month: "05",
        year: null,
      });
    }
  });
});
