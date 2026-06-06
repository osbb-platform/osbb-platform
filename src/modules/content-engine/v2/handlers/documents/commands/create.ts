import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateDocumentPayload, HouseDocument } from "../types";
import {
  HOUSE_DOCUMENT_BUCKET,
  normalizeCategory,
  normalizeDescription,
  normalizeDocumentType,
  normalizeDocumentYear,
  normalizePdf,
  normalizeScope,
  publicDocumentPaths,
  toFileTrack,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateDocumentPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву документа.", "VALIDATION_FAILED");
    }

    const pdf = normalizePdf(payload.pdf);
    if (!pdf) {
      return err("PDF не завантажено.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateDocumentPayload;
    const scope = normalizeScope(payload.documentScope);
    const pdf = normalizePdf(payload.pdf);

    if (!pdf) {
      return err("PDF не завантажено.", "VALIDATION_FAILED");
    }

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_documents")
      .insert({
        house_id: ctx.house.id,
        title: payload.title.trim(),
        category: normalizeCategory(payload.category),
        lifecycle_status: "draft",
        description: normalizeDescription(payload.description),
        document_year: normalizeDocumentYear(payload.documentYear, scope),
        document_scope: scope,
        document_type: normalizeDocumentType(payload.documentType, scope),
        storage_bucket: pdf.bucket || HOUSE_DOCUMENT_BUCKET,
        storage_path: pdf.path,
        original_file_name: pdf.originalName ?? null,
        mime_type: pdf.mimeType ?? "application/pdf",
        file_size_bytes: pdf.size ?? null,
        attachment_status: "uploaded",
        uploaded_at: now,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(
        `Не вдалося створити документ: ${error?.message ?? "невідома помилка"}`,
        "INTERNAL",
      );
    }

    const document = data as HouseDocument;

    return ok({
      data: document,
      history: {
        entityType: "house_document",
        entityId: document.id,
        action: "created",
        description: `Створено документ «${document.title}».`,
        afterSnapshot: document,
        metadata: {
          subSectionKey: "documents",
          documentScope: document.document_scope,
        },
      },
      filesToTrack: [toFileTrack(pdf)],
      tasks: {
        ensure: {
          entityType: "house_document",
          entityId: document.id,
          title: document.title,
        },
      },
      extraRevalidatePaths: publicDocumentPaths(ctx.house.slug),
    });
  },
};
