import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_ANNOUNCEMENT_BUCKET,
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  HOUSE_ANNOUNCEMENT_MAX_PDF_SIZE_BYTES,
  HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY,
  type Announcement,
  type AnnouncementIdAndLock,
  type AnnouncementLevel,
  type HouseAnnouncementFileInput,
} from "../types";

export {
  HOUSE_ANNOUNCEMENT_BUCKET,
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  HOUSE_ANNOUNCEMENT_MAX_PDF_SIZE_BYTES,
  HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeBody(value: unknown): string {
  return normalizeText(value);
}

export function normalizeLevel(value: unknown): AnnouncementLevel {
  if (value === "danger" || value === "warning" || value === "info") {
    return value;
  }

  return "info";
}

export function normalizeOptionalAnnouncementId(value: unknown): string | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return UUID_RE.test(normalized) ? normalized : null;
}

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

export function normalizeAnnouncementPdfInput(
  rawPdf: unknown,
  params: {
    houseId: string;
    announcementId?: string | null;
    requirePdf?: boolean;
  },
): Result<HouseAnnouncementFileInput | null> {
  if (!rawPdf) {
    if (params.requirePdf) {
      return err("PDF не завантажено.", "VALIDATION_FAILED");
    }

    return ok(null);
  }

  if (typeof rawPdf !== "object") {
    return err("PDF не завантажено.", "VALIDATION_FAILED");
  }

  const pdf = rawPdf as Partial<HouseAnnouncementFileInput>;
  const bucket = normalizeText(pdf.bucket);
  const path = normalizeText(pdf.path);
  const originalName = normalizeText(pdf.originalName);
  const mimeType = normalizeText(pdf.mimeType);
  const size = pdf.size;

  if (bucket !== HOUSE_ANNOUNCEMENT_BUCKET) {
    return err("PDF оголошення має бути завантажений у правильне сховище.", "VALIDATION_FAILED");
  }

  if (!path) {
    return err("PDF не завантажено.", "VALIDATION_FAILED");
  }

  const housePrefix = `houses/${params.houseId}/announcements/`;
  if (!path.startsWith(housePrefix)) {
    return err("PDF оголошення має належати поточному будинку.", "VALIDATION_FAILED");
  }

  if (params.announcementId) {
    const entityPrefix = `${housePrefix}${params.announcementId}/`;
    if (!path.startsWith(entityPrefix)) {
      return err("PDF оголошення має належати поточному оголошенню.", "VALIDATION_FAILED");
    }
  }

  if (!isPdfPath(path)) {
    return err("Додаток до оголошення має бути PDF-файлом.", "VALIDATION_FAILED");
  }

  if (mimeType !== "application/pdf") {
    return err("Додаток до оголошення має бути PDF-файлом.", "VALIDATION_FAILED");
  }

  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    return err("Не вдалося визначити розмір PDF-файлу.", "VALIDATION_FAILED");
  }

  if (size > HOUSE_ANNOUNCEMENT_MAX_PDF_SIZE_BYTES) {
    return err("PDF оголошення має бути не більше 15 МБ.", "VALIDATION_FAILED");
  }

  return ok({
    bucket,
    path,
    originalName: originalName || null,
    mimeType,
    size,
  });
}

export function readIdAndLock(rawPayload: unknown): Result<AnnouncementIdAndLock> {
  const payload = rawPayload as Partial<AnnouncementIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID оголошення.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію оголошення.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getAnnouncement(
  ctx: HandlerContext,
  id: string,
): Promise<Result<Announcement>> {
  const { data, error } = await ctx.supabase
    .from("house_announcements")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Оголошення не знайдено.", "NOT_FOUND");
  }

  return ok(data as Announcement);
}

export function toFileTrack(pdf: HouseAnnouncementFileInput) {
  return {
    fieldKey: HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY,
    bucket: pdf.bucket || HOUSE_ANNOUNCEMENT_BUCKET,
    path: pdf.path,
    originalName: pdf.originalName,
    mimeType: pdf.mimeType ?? "application/pdf",
    size: pdf.size,
  };
}

export function pdfDeleteRef(entityId: string) {
  return {
    entityType: HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
    entityId,
    fieldKeys: [HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY],
  };
}

export function allFilesDeleteRef(entityId: string) {
  return {
    entityType: HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
    entityId,
  };
}

export function publicAnnouncementPaths(houseSlug: string) {
  return [`/house/${houseSlug}`, `/house/${houseSlug}/announcements`];
}

export function announcementHistoryMetadata(metadata: Record<string, unknown> = {}) {
  return {
    subSectionKey: "announcements",
    ...metadata,
  };
}
