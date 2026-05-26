import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { InformationPost } from "../types";
import { getInformationPost, readIdAndLock } from "./shared";

export const restoreCommand: CommandSpec = {
  actionKey: "restore",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);

    if (!idAndLock.ok) {
      return idAndLock;
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = readIdAndLock(rawPayload);

    if (!payload.ok) {
      return payload;
    }

    const beforeResult = await getInformationPost(ctx, payload.data.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_information_posts")
      .update({
        lifecycle_status: "draft",
        archived_at: null,
        lock_version: payload.data.lockVersion + 1,
        updated_at: now,
      })
      .eq("id", payload.data.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.data.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const post = data as InformationPost;

    return ok({
      data: post,
      history: {
        entityType: "house_information_post",
        entityId: post.id,
        action: "restored",
        description: `Відновлено інформаційний матеріал «${post.headline}».`,
        beforeSnapshot: before,
        afterSnapshot: post,
        metadata: {
          subSectionKey: "information_posts",
        },
      },
      tasks: {
        ensure: {
          entityType: "house_information_post",
          entityId: post.id,
          title: post.headline,
        },
      },
    });
  },
};
