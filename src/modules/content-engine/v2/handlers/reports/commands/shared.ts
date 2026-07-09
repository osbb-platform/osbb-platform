import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_REPORT_BUCKET,
  HOUSE_REPORT_CATEGORY_ENTITY_TYPE,
  HOUSE_REPORT_ENTITY_TYPE,
  HOUSE_REPORT_PDF_FIELD_KEY,
  type HouseReport,
  type HouseReportFileInput,
  type HouseReportPeriod,
  type HouseReportPeriodKind,
  type HouseReportPeriodType,
  type ReportIdAndLock,
} from "../types";

export {
  HOUSE_REPORT_BUCKET,
  HOUSE_REPORT_CATEGORY_ENTITY_TYPE,
  HOUSE_REPORT_ENTITY_TYPE,
  HOUSE_REPORT_PDF_FIELD_KEY,
};

const PERIOD_YEAR_MIN = 2000;
const PERIOD_YEAR_MAX = 2100;

type PeriodPayload = {
  period?: unknown;
  periodType?: unknown;
  month?: unknown;
  quarter?: unknown;
  year?: unknown;
};

export type HouseReportPeriodColumns = {
  period_kind: HouseReportPeriodKind;
  period_month: number | null;
  period_quarter: number | null;
  period_year: number | null;
};

export type HouseReportLegacyPeriodColumns = {
  period_type: HouseReportPeriodType;
  month: string | null;
  year: number | null;
};

export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

export function normalizeDescription(value: unknown): string {
  return normalizeText(value);
}

export function normalizeCategoryId(value: unknown): string | null {
  return normalizeNullableText(value);
}

export function normalizeCategoryTitle(value: unknown): string {
  return normalizeText(value);
}

export function normalizePeriodType(value: unknown): HouseReportPeriodType {
  return value === "past" ? "past" : "current";
}

export function normalizeReportDate(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

export function normalizeMonth(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

export function normalizeYear(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value >= 1900 && value <= 2100 ? value : null;
}

function isProvided(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  return true;
}

function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function readQuarter(value: unknown): number | null {
  const integer = readInteger(value);
  if (integer !== null) {
    return integer;
  }

  const normalized = normalizeText(value).toUpperCase();
  const roman: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
  };

  return roman[normalized] ?? null;
}

function isValidPeriodYear(value: number | null): value is number {
  return value !== null && value >= PERIOD_YEAR_MIN && value <= PERIOD_YEAR_MAX;
}

function readLegacyPeriod(payload: PeriodPayload): HouseReportPeriod {
  const legacyMonth = normalizeMonth(payload.month);
  const legacyYear = readInteger(payload.year);

  if (legacyMonth && isValidPeriodYear(legacyYear)) {
    const monthNumber = readInteger(legacyMonth);

    if (monthNumber !== null && monthNumber >= 1 && monthNumber <= 12) {
      return {
        kind: "month",
        month: monthNumber,
        year: legacyYear,
      };
    }
  }

  if (!legacyMonth && isValidPeriodYear(legacyYear)) {
    return {
      kind: "year",
      year: legacyYear,
    };
  }

  return { kind: "none" };
}

function readExplicitPeriod(value: unknown): Result<HouseReportPeriod> {
  if (!value || typeof value !== "object") {
    return err("Оберіть коректний тип періоду звіту.", "VALIDATION_FAILED");
  }

  const record = value as Record<string, unknown>;
  const kind = normalizeText(record.kind);

  if (!["none", "month", "quarter", "year"].includes(kind)) {
    return err("Оберіть коректний тип періоду звіту.", "VALIDATION_FAILED");
  }

  const hasMonth = isProvided(record.month);
  const hasQuarter = isProvided(record.quarter);
  const hasYear = isProvided(record.year);

  if (kind === "none") {
    if (hasMonth || hasQuarter || hasYear) {
      return err(
        "Для типу «без періоду» не можна вказувати місяць, квартал або рік.",
        "VALIDATION_FAILED",
      );
    }

    return ok({ kind: "none" });
  }

  if (kind === "month") {
    if (hasQuarter) {
      return err("Оберіть лише один формат періоду звіту.", "VALIDATION_FAILED");
    }

    if (!hasMonth || !hasYear) {
      return err("Для місячного звіту вкажіть місяць і рік.", "VALIDATION_FAILED");
    }

    const month = readInteger(record.month);
    if (month === null || month < 1 || month > 12) {
      return err("Місяць звіту має бути від 1 до 12.", "VALIDATION_FAILED");
    }

    const year = readInteger(record.year);
    if (!isValidPeriodYear(year)) {
      return err("Рік звіту має бути в межах 2000–2100.", "VALIDATION_FAILED");
    }

    return ok({ kind: "month", month, year });
  }

  if (kind === "quarter") {
    if (hasMonth) {
      return err("Оберіть лише один формат періоду звіту.", "VALIDATION_FAILED");
    }

    if (!hasQuarter || !hasYear) {
      return err("Для квартального звіту вкажіть квартал і рік.", "VALIDATION_FAILED");
    }

    const quarter = readQuarter(record.quarter);
    if (quarter === null || quarter < 1 || quarter > 4) {
      return err("Квартал звіту має бути від I до IV.", "VALIDATION_FAILED");
    }

    const year = readInteger(record.year);
    if (!isValidPeriodYear(year)) {
      return err("Рік звіту має бути в межах 2000–2100.", "VALIDATION_FAILED");
    }

    return ok({ kind: "quarter", quarter, year });
  }

  if (hasMonth || hasQuarter) {
    return err("Оберіть лише один формат періоду звіту.", "VALIDATION_FAILED");
  }

  if (!hasYear) {
    return err("Для річного звіту вкажіть рік.", "VALIDATION_FAILED");
  }

  const year = readInteger(record.year);
  if (!isValidPeriodYear(year)) {
    return err("Рік звіту має бути в межах 2000–2100.", "VALIDATION_FAILED");
  }

  return ok({ kind: "year", year });
}

export function readHouseReportPeriod(rawPayload: unknown): Result<HouseReportPeriod> {
  const payload =
    rawPayload && typeof rawPayload === "object"
      ? (rawPayload as PeriodPayload)
      : {};

  if (isProvided(payload.period)) {
    return readExplicitPeriod(payload.period);
  }

  return ok(readLegacyPeriod(payload));
}

export function toPeriodColumns(period: HouseReportPeriod): HouseReportPeriodColumns {
  switch (period.kind) {
    case "month":
      return {
        period_kind: "month",
        period_month: period.month,
        period_quarter: null,
        period_year: period.year,
      };

    case "quarter":
      return {
        period_kind: "quarter",
        period_month: null,
        period_quarter: period.quarter,
        period_year: period.year,
      };

    case "year":
      return {
        period_kind: "year",
        period_month: null,
        period_quarter: null,
        period_year: period.year,
      };

    case "none":
      return {
        period_kind: "none",
        period_month: null,
        period_quarter: null,
        period_year: null,
      };
  }
}

function formatLegacyMonth(value: number): string {
  return String(value).padStart(2, "0");
}

export function toLegacyPeriodColumns(
  payload: PeriodPayload,
  period: HouseReportPeriod,
): HouseReportLegacyPeriodColumns {
  const legacyPeriodType = normalizePeriodType(payload.periodType);
  const legacyMonth = normalizeMonth(payload.month);
  const legacyYear = normalizeYear(payload.year);

  if (isProvided(payload.periodType) || legacyMonth || legacyYear !== null) {
    return {
      period_type: legacyPeriodType,
      month: legacyMonth,
      year: legacyYear,
    };
  }

  if (period.kind === "month") {
    return {
      period_type: "current",
      month: formatLegacyMonth(period.month),
      year: period.year,
    };
  }

  if (period.kind === "year" || period.kind === "quarter") {
    return {
      period_type: "past",
      month: null,
      year: period.year,
    };
  }

  return {
    period_type: "current",
    month: null,
    year: null,
  };
}

export function normalizeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

export function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

export function normalizeDateTime(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

export function normalizePdf(value: unknown): HouseReportFileInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const bucket = normalizeText(record.bucket) || HOUSE_REPORT_BUCKET;
  const path = normalizeText(record.path);

  if (!bucket || !path) {
    return null;
  }

  return {
    bucket,
    path,
    originalName:
      typeof record.originalName === "string" ? record.originalName : null,
    mimeType:
      typeof record.mimeType === "string"
        ? record.mimeType
        : "application/pdf",
    size: typeof record.size === "number" ? record.size : null,
  };
}

export function readIdAndLock(rawPayload: unknown): Result<ReportIdAndLock> {
  const payload = rawPayload as Partial<ReportIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID звіту.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію звіту.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getReport(
  ctx: HandlerContext,
  id: string,
): Promise<Result<HouseReport>> {
  const { data, error } = await ctx.supabase
    .from("house_reports")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Звіт не знайдено.", "NOT_FOUND");
  }

  return ok(data as HouseReport);
}

export function toFileTrack(pdf: HouseReportFileInput) {
  return {
    fieldKey: HOUSE_REPORT_PDF_FIELD_KEY,
    bucket: pdf.bucket || HOUSE_REPORT_BUCKET,
    path: pdf.path,
    originalName: pdf.originalName,
    mimeType: pdf.mimeType ?? "application/pdf",
    size: pdf.size,
  };
}

export function pdfDeleteRef(entityId: string) {
  return {
    entityType: HOUSE_REPORT_ENTITY_TYPE,
    entityId,
    fieldKeys: [HOUSE_REPORT_PDF_FIELD_KEY],
  };
}

export function publicReportPaths(houseSlug: string) {
  return [`/house/${houseSlug}`, `/house/${houseSlug}/reports`];
}

export function reportHistoryMetadata(metadata: Record<string, unknown> = {}) {
  return {
    subSectionKey: "reports",
    ...metadata,
  };
}
