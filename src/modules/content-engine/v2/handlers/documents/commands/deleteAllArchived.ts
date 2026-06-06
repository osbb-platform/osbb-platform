import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type {
  DeleteAllArchivedDocumentsPayload,
  HouseDocument,
} from "../types";
import {
  HOUSE_DOCUMENT_ENTITY_TYPE,
  normalizeScope,
  publicDocumentPaths,
} from "./shared";

export const deleteAllArchivedCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(rawPayload, ctx) {
    const payload = rawPayload as DeleteAllArchivedDocumentsPayload;
    const scope = normalizeScope(payload.documentScope);

    const { data, error } = await ctx.supabase
      .from("house_documents")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("document_scope", scope)
      .eq("lifecycle_status", "archived")
      .select("*");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const documents = (data ?? []) as HouseDocument[];

    return ok({
      data: {
        deletedCount: documents.length,
      },
      history: {
        entityType: HOUSE_DOCUMENT_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "bulk_deleted_archived",
        description: `Масово видалено архівні документи: ${documents.length}.`,
        beforeSnapshot: documents,
        metadata: {
          subSectionKey: "documents",
          documentScope: scope,
          deletedCount: documents.length,
        },
      },
      filesToDelete: documents.map((document) => ({
        entityType: HOUSE_DOCUMENT_ENTITY_TYPE,
        entityId: document.id,
      })),
      extraRevalidatePaths: publicDocumentPaths(ctx.house.slug),
    });
  },
};
