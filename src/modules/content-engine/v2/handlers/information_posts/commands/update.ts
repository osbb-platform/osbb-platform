import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { InformationPost, UpdateInformationPostPayload } from "../types";
import {
  INFORMATION_POST_COVER_FIELD_KEY,
  INFORMATION_POST_ENTITY_TYPE,
  getInformationPost,
  isValidCategory,
  normalizeBoolean,
  normalizeCoverImage,
  readIdAndLock,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);

    if (!idAndLock.ok) {
      return idAndLock;
    }

    const payload = rawPayload as Partial<UpdateInformationPostPayload>;

    if (!payload.headline?.trim()) {
      return err("Заповніть заголовок інформаційного матеріалу.", "VALIDATION_FAILED");
    }

    if (!payload.body?.trim()) {
      return err("Заповніть текст інформаційного матеріалу.", "VALIDATION_FAILED");
    }

    if (!isValidCategory(payload.category)) {
      return err("Невірна категорія інформаційного матеріалу.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateInformationPostPayload;
    const beforeResult = await getInformationPost(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const coverImage = normalizeCoverImage(payload.coverImage);
    const shouldRemoveCoverImage = payload.removeCoverImage === true || Boolean(coverImage);

    const { data, error } = await ctx.supabase
      .from("house_information_posts")
      .update({
        headline: payload.headline.trim(),
        body: payload.body.trim(),
        category: payload.category,
        is_pinned: normalizeBoolean(payload.isPinned),
        lock_version: payload.lockVersion + 1,
        updated_at: new Date().toISOString(),
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

    const post = data as InformationPost;

    return ok({
      data: post,
      history: {
        entityType: "house_information_post",
        entityId: post.id,
        action: "updated",
        description: `Оновлено інформаційний матеріал «${post.headline}».`,
        beforeSnapshot: before,
        afterSnapshot: post,
        metadata: {
          subSectionKey: "information_posts",
        },
      },
      filesToDelete: shouldRemoveCoverImage
        ? [
            {
              entityType: INFORMATION_POST_ENTITY_TYPE,
              entityId: post.id,
              fieldKeys: [INFORMATION_POST_COVER_FIELD_KEY],
            },
          ]
        : undefined,
      filesToTrack: coverImage
        ? [
            {
              fieldKey: INFORMATION_POST_COVER_FIELD_KEY,
              bucket: coverImage.bucket,
              path: coverImage.path,
              originalName: coverImage.originalName,
              mimeType: coverImage.mimeType,
              size: coverImage.size,
            },
          ]
        : undefined,
    });
  },
};
