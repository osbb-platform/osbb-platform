import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateInformationPostPayload, InformationPost } from "../types";
import {
  INFORMATION_POST_COVER_FIELD_KEY,
  isValidCategory,
  normalizeBoolean,
  normalizeCoverImage,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateInformationPostPayload>;

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
    const payload = rawPayload as CreateInformationPostPayload;
    const coverImage = normalizeCoverImage(payload.coverImage);

    const { data, error } = await ctx.supabase
      .from("house_information_posts")
      .insert({
        house_id: ctx.house.id,
        headline: payload.headline.trim(),
        body: payload.body.trim(),
        category: payload.category,
        is_pinned: normalizeBoolean(payload.isPinned),
        lifecycle_status: "draft",
        created_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(
        `Не вдалося створити інформаційний матеріал: ${error?.message ?? "невідома помилка"}`,
        "INTERNAL",
      );
    }

    const post = data as InformationPost;

    return ok({
      data: post,
      history: {
        entityType: "house_information_post",
        entityId: post.id,
        action: "created",
        description: `Створено інформаційний матеріал «${post.headline}».`,
        afterSnapshot: post,
        metadata: {
          subSectionKey: "information_posts",
        },
      },
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
