import type { CommandSpec } from "../../../types/handler";
import { ok } from "../../../types/result";
import type { HouseDocument } from "../types";
import {
  pdfDeleteRef,
  publicDocumentPaths,
  readIdAndLock,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as { id: string; lockVersion: number };

    const { data, error } = await ctx.supabase
      .from("house_documents")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: error.message,
        code: "INTERNAL" as const,
      };
    }

    if (!data) {
      return {
        ok: false,
        error: "Документ не знайдено або дані застаріли, оновіть сторінку.",
        code: "STALE_CONTENT" as const,
      };
    }

    const document = data as HouseDocument;

    return ok({
      data: document,
      history: {
        entityType: "house_document",
        entityId: document.id,
        action: "deleted",
        description: `Видалено документ «${document.title}».`,
        beforeSnapshot: document,
        metadata: {
          subSectionKey: "documents",
          documentScope: document.document_scope,
        },
      },
      filesToDelete: [pdfDeleteRef(document.id)],
      tasks: {
        delete: {
          entityType: "house_document",
          entityId: document.id,
        },
      },
      extraRevalidatePaths: publicDocumentPaths(ctx.house.slug),
    });
  },
};
