import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { DocumentIdAndLock, HouseDocument } from "../types";
import {
  getDocument,
  publicDocumentPaths,
  readIdAndLock,
} from "./shared";

export const restoreCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as DocumentIdAndLock;
    const beforeResult = await getDocument(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_documents")
      .update({
        lifecycle_status: "draft",
        published_at: null,
        archived_at: null,
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
        action: "restored",
        description: `Відновлено документ «${document.title}».`,
        beforeSnapshot: before,
        afterSnapshot: document,
        metadata: {
          subSectionKey: "documents",
          documentScope: document.document_scope,
        },
      },
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
