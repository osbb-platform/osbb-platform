import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_DOCUMENT_BUCKET,
  HOUSE_DOCUMENT_ENTITY_TYPE,
  HOUSE_DOCUMENT_PDF_FIELD_KEY,
  type DocumentIdAndLock,
  type HouseDocument,
  type HouseDocumentCategory,
  type HouseDocumentFileInput,
  type HouseDocumentScope,
  type HouseDocumentType,
} from "../types";

const validCategories: HouseDocumentCategory[] = [
  "regulations",
  "tariffs",
  "meetings",
  "technical",
  "contracts",
  "resident_info",
];

const validScopes: HouseDocumentScope[] = ["information", "founding"];

const validTypes: HouseDocumentType[] = [
  "statute",
  "extract",
  "protocol",
  "registration",
  "contracts",
  "other",
];

export {
  HOUSE_DOCUMENT_BUCKET,
  HOUSE_DOCUMENT_ENTITY_TYPE,
  HOUSE_DOCUMENT_PDF_FIELD_KEY,
};

export function isValidCategory(value: unknown): value is HouseDocumentCategory {
  return typeof value === "string" && validCategories.includes(value as HouseDocumentCategory);
}

export function normalizeCategory(value: unknown): HouseDocumentCategory {
  return isValidCategory(value) ? value : "regulations";
}

export function isValidScope(value: unknown): value is HouseDocumentScope {
  return typeof value === "string" && validScopes.includes(value as HouseDocumentScope);
}

export function normalizeScope(value: unknown): HouseDocumentScope {
  return isValidScope(value) ? value : "information";
}

export function isValidDocumentType(value: unknown): value is HouseDocumentType {
  return typeof value === "string" && validTypes.includes(value as HouseDocumentType);
}

export function normalizeDocumentType(
  value: unknown,
  scope: HouseDocumentScope,
): HouseDocumentType | null {
  if (scope !== "founding") {
    return null;
  }

  return isValidDocumentType(value) ? value : "other";
}

export function normalizeDocumentYear(
  value: unknown,
  scope: HouseDocumentScope,
): number | null {
  if (scope !== "information") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value >= 2016 && value <= 2026 ? value : null;
}

export function normalizeDescription(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizePdf(value: unknown): HouseDocumentFileInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const bucket = typeof record.bucket === "string" ? record.bucket.trim() : "";
  const path = typeof record.path === "string" ? record.path.trim() : "";

  if (!bucket || !path) {
    return null;
  }

  return {
    bucket,
    path,
    originalName:
      typeof record.originalName === "string" ? record.originalName : null,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "application/pdf",
    size: typeof record.size === "number" ? record.size : null,
  };
}

export function readIdAndLock(rawPayload: unknown): Result<DocumentIdAndLock> {
  const payload = rawPayload as Partial<DocumentIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID документа.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію документа.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getDocument(
  ctx: HandlerContext,
  id: string,
): Promise<Result<HouseDocument>> {
  const { data, error } = await ctx.supabase
    .from("house_documents")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Документ не знайдено.", "NOT_FOUND");
  }

  return ok(data as HouseDocument);
}

export function toFileTrack(pdf: HouseDocumentFileInput) {
  return {
    fieldKey: HOUSE_DOCUMENT_PDF_FIELD_KEY,
    bucket: pdf.bucket,
    path: pdf.path,
    originalName: pdf.originalName,
    mimeType: pdf.mimeType ?? "application/pdf",
    size: pdf.size,
  };
}

export function pdfDeleteRef(entityId: string) {
  return {
    entityType: HOUSE_DOCUMENT_ENTITY_TYPE,
    entityId,
    fieldKeys: [HOUSE_DOCUMENT_PDF_FIELD_KEY],
  };
}

export function publicDocumentPaths(houseSlug: string) {
  return [
    `/house/${houseSlug}/information`,
    `/house/${houseSlug}/founding-documents`,
  ];
}
