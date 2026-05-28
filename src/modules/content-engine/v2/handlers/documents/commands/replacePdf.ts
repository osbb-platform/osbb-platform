import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseDocument, ReplaceDocumentPdfPayload } from "../types";
import {
  getDocument,
  normalizePdf,
  pdfDeleteRef,
  publicDocumentPaths,
  readIdAndLock,
  toFileTrack,
} from "./shared";

export const replacePdfCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<ReplaceDocumentPdfPayload>;
    const pdf = normalizePdf(payload.pdf);

    if (!pdf) {
      return err("PDF не завантажено.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReplaceDocumentPdfPayload;
    const beforeResult = await getDocument(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const pdf = normalizePdf(payload.pdf);

    if (!pdf) {
      return err("PDF не завантажено.", "VALIDATION_FAILED");
    }

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_documents")
      .update({
        storage_bucket: pdf.bucket,
        storage_path: pdf.path,
        original_file_name: pdf.originalName ?? null,
        mime_type: pdf.mimeType ?? "application/pdf",
        file_size_bytes: pdf.size ?? null,
        attachment_status: "uploaded",
        uploaded_at: now,
        updated_at: now,
        lock_version: payload.lockVersion + 1,
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
        action: "pdf_replaced",
        description: `Замінено PDF документа «${document.title}».`,
        beforeSnapshot: before,
        afterSnapshot: document,
        metadata: {
          subSectionKey: "documents",
          documentScope: document.document_scope,
        },
      },
      filesToDelete: [pdfDeleteRef(document.id)],
      filesToTrack: [toFileTrack(pdf)],
      extraRevalidatePaths: publicDocumentPaths(ctx.house.slug),
    });
  },
};
