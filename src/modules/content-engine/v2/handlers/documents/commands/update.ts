import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseDocument, UpdateDocumentPayload } from "../types";
import {
  getDocument,
  normalizeCategory,
  normalizeDescription,
  normalizeDocumentType,
  normalizeDocumentYear,
  normalizePdf,
  normalizeScope,
  pdfDeleteRef,
  publicDocumentPaths,
  readIdAndLock,
  toFileTrack,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdateDocumentPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву документа.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateDocumentPayload;
    const beforeResult = await getDocument(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const scope = normalizeScope(payload.documentScope);
    const pdf = normalizePdf(payload.pdf);
    const shouldRemovePdf = payload.removePdf === true || Boolean(pdf);
    const now = new Date().toISOString();

    const attachmentPatch = pdf
      ? {
          storage_bucket: pdf.bucket,
          storage_path: pdf.path,
          original_file_name: pdf.originalName ?? null,
          mime_type: pdf.mimeType ?? "application/pdf",
          file_size_bytes: pdf.size ?? null,
          uploaded_at: now,
          attachment_status: "uploaded",
        }
      : payload.removePdf === true
        ? {
            storage_bucket: null,
            storage_path: null,
            original_file_name: null,
            mime_type: null,
            file_size_bytes: null,
            uploaded_at: null,
            attachment_status: "none",
          }
        : {};

    const { data, error } = await ctx.supabase
      .from("house_documents")
      .update({
        title: payload.title.trim(),
        category: normalizeCategory(payload.category),
        description: normalizeDescription(payload.description),
        document_year: normalizeDocumentYear(payload.documentYear, scope),
        document_scope: scope,
        document_type: normalizeDocumentType(payload.documentType, scope),
        updated_at: now,
        lock_version: payload.lockVersion + 1,
        ...attachmentPatch,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const document = data as HouseDocument;

    return ok({
      data: document,
      history: {
        entityType: "house_document",
        entityId: document.id,
        action: "updated",
        description: `Оновлено документ «${document.title}».`,
        beforeSnapshot: before,
        afterSnapshot: document,
        metadata: {
          subSectionKey: "documents",
          documentScope: document.document_scope,
        },
      },
      filesToDelete: shouldRemovePdf ? [pdfDeleteRef(document.id)] : undefined,
      filesToTrack: pdf ? [toFileTrack(pdf)] : undefined,
      extraRevalidatePaths: publicDocumentPaths(ctx.house.slug),
    });
  },
};
