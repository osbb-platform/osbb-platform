import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_REPORT_BUCKET,
  HOUSE_REPORT_CATEGORY_ENTITY_TYPE,
  HOUSE_REPORT_ENTITY_TYPE,
  HOUSE_REPORT_PDF_FIELD_KEY,
  type HouseReport,
  type HouseReportFileInput,
  type HouseReportPeriodType,
  type ReportIdAndLock,
} from "../types";

export {
  HOUSE_REPORT_BUCKET,
  HOUSE_REPORT_CATEGORY_ENTITY_TYPE,
  HOUSE_REPORT_ENTITY_TYPE,
  HOUSE_REPORT_PDF_FIELD_KEY,
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
