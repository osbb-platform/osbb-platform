import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { InformationPost } from "../types";
import {
  INFORMATION_POST_ENTITY_TYPE,
  readIdAndLock,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
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

    const { data, error } = await ctx.supabase
      .from("house_information_posts")
      .delete()
      .eq("id", payload.data.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.data.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Інформаційний матеріал не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const post = data as InformationPost;

    return ok({
      data: post,
      history: {
        entityType: "house_information_post",
        entityId: post.id,
        action: "deleted",
        description: `Видалено інформаційний матеріал «${post.headline}».`,
        beforeSnapshot: post,
        afterSnapshot: null,
        metadata: {
          subSectionKey: "information_posts",
        },
      },
      filesToDelete: [
        {
          entityType: INFORMATION_POST_ENTITY_TYPE,
          entityId: post.id,
        },
      ],
      tasks: {
        delete: {
          entityType: "house_information_post",
          entityId: post.id,
        },
      },
    });
  },
};
