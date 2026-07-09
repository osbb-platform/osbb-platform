"use client";

import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import type { HouseAnnouncementFileInput } from "@/src/modules/content-engine/v2/handlers/announcements/types";

export const HOUSE_ANNOUNCEMENT_PDF_BUCKET = "house-announcements";

export function createClientUploadId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomId}`;
}

export function createClientUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomHex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-8${randomHex(3)}-${randomHex(12)}`;
}

export function getPdfFileLabel(pdf: HouseAnnouncementFileInput | null | undefined) {
  return pdf?.originalName?.trim() || "PDF додано";
}

export function getFileSizeLabel(size: number | null | undefined) {
  if (!size || !Number.isFinite(size) || size <= 0) {
    return null;
  }

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} МБ`;
  }

  return `${Math.max(1, Math.round(size / 1024))} КБ`;
}

export function normalizeAnnouncementPdfFromContent(
  value: unknown,
): HouseAnnouncementFileInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<HouseAnnouncementFileInput>;
  const bucket = typeof record.bucket === "string" ? record.bucket.trim() : "";
  const path = typeof record.path === "string" ? record.path.trim() : "";

  if (!bucket || !path) {
    return null;
  }

  return {
    bucket,
    path,
    originalName:
      typeof record.originalName === "string" && record.originalName.trim()
        ? record.originalName.trim()
        : null,
    mimeType:
      typeof record.mimeType === "string" && record.mimeType.trim()
        ? record.mimeType.trim()
        : "application/pdf",
    size: typeof record.size === "number" && Number.isFinite(record.size)
      ? record.size
      : null,
    uploadedAt:
      typeof record.uploadedAt === "string" && record.uploadedAt.trim()
        ? record.uploadedAt.trim()
        : null,
  };
}

export async function uploadAnnouncementPdf(params: {
  houseId: string;
  announcementId: string;
  file: File | null;
}) {
  if (!params.file) {
    return null;
  }

  const supabase = createSupabaseBrowserClient();
  const fileExt = params.file.name.split(".").pop() ?? "pdf";
  const fileName = `${createClientUploadId("announcement")}.${fileExt}`;
  const filePath = `houses/${params.houseId}/announcements/${params.announcementId}/${fileName}`;

  const { error } = await supabase.storage
    .from(HOUSE_ANNOUNCEMENT_PDF_BUCKET)
    .upload(filePath, params.file, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (error) {
    console.error("Announcement PDF upload error:", error);
    throw new Error(
      "Не вдалося завантажити PDF. Якщо сесія завершилась, увійдіть в адмінку ще раз і повторіть дію.",
    );
  }

  return {
    bucket: HOUSE_ANNOUNCEMENT_PDF_BUCKET,
    path: filePath,
    originalName: params.file.name,
    mimeType: "application/pdf",
    size: params.file.size,
  };
}
