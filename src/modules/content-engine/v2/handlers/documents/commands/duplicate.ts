import type { CommandSpec } from "../../../types/handler";
import {
  duplicateTableRecordToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { err, ok } from "../../../types/result";
import type { HouseDocument } from "../types";
import {
  HOUSE_DOCUMENT_BUCKET,
  HOUSE_DOCUMENT_PDF_FIELD_KEY,
  publicDocumentPaths,
} from "./shared";

export const duplicateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    return validateDuplicatePayload(rawPayload);
  },

  async execute(rawPayload, ctx) {
    const payloadResult = parseDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const result = await duplicateTableRecordToDraft<HouseDocument>({
      ctx,
      sourceTable: "house_documents",
      entityType: "house_document",
      sourceId: payloadResult.data.sourceId,
      targetHouseIds: payloadResult.data.targetHouseIds,
      sourceTitle: (source) => source.title,
      buildInsert: ({ source, targetHouse, newId, now, copiedFiles }) => {
        const pdf = copiedFiles.find(
          (file) => file.fieldKey === HOUSE_DOCUMENT_PDF_FIELD_KEY,
        );

        if (!pdf) {
          throw new Error("PDF документа не знайдено серед скопійованих файлів.");
        }

        return {
          id: newId,
          house_id: targetHouse.id,
          title: source.title,
          category: source.category,
          lifecycle_status: "draft",
          description: source.description,
          document_year: source.document_year,
          document_scope: source.document_scope,
          document_type: source.document_type,
          storage_bucket: pdf.bucket || HOUSE_DOCUMENT_BUCKET,
          storage_path: pdf.path,
          original_file_name: pdf.originalName,
          mime_type: pdf.mimeType ?? "application/pdf",
          file_size_bytes: pdf.size,
          attachment_status: "uploaded",
          uploaded_at: now,
          published_at: null,
          archived_at: null,
          created_at: now,
          updated_at: now,
        };
      },
      targetDescription: ({ source }) =>
        `Створено чернетку документа «${source.title}» з дублювання.`,
      historyMetadata: { subSectionKey: "documents" },
      publicPathsForHouse: publicDocumentPaths,
    });

    if (!result.ok) {
      if (result.error.includes("PDF документа")) {
        return err(result.error, "STORAGE_ERROR");
      }

      return result;
    }

    return ok({
      data: result.data,
      history: {
        entityType: "house_document",
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `Документ «${result.data.source.title}» дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: {
          subSectionKey: "documents",
          documentScope: result.data.source.document_scope,
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        },
      },
      extraRevalidatePaths: publicDocumentPaths(ctx.house.slug),
    });
  },
};
