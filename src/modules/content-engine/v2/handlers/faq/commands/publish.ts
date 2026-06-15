import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { FaqLockPayload, HouseFaq } from "../types";
import { getHouseFaq, readFaqId, readLockVersion } from "./shared";

export const publishCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const faqId = readFaqId(rawPayload);
    if (!faqId.ok) return faqId;

    const lockResult = readLockVersion(rawPayload);
    if (!lockResult.ok) return lockResult;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as FaqLockPayload;
    const beforeResult = await getHouseFaq(ctx, payload.faqId);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    const { data, error } = await ctx.supabase.rpc("publish_house_faq", {
      p_house_id: ctx.house.id,
      p_faq_id: payload.faqId,
      p_lock_version: payload.lockVersion,
    });

    if (error) {
      if (error.message.includes("STALE_CONTENT")) {
        return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
      }

      if (error.message.includes("FAQ_NOT_FOUND")) {
        return err("FAQ не знайдено.", "NOT_FOUND");
      }

      if (error.message.includes("FAQ_ARCHIVED")) {
        return err("Архівний FAQ не можна підтвердити.", "VALIDATION_FAILED");
      }

      return err(error.message, "INTERNAL");
    }

    const faq = data as HouseFaq;

    return ok({
      data: faq,
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "published",
        description: "Опубліковано FAQ будинку. Попередній активний FAQ перенесено в архів.",
        beforeSnapshot: before,
        afterSnapshot: faq,
        metadata: {
          subSectionKey: "faq",
          replacedPreviousPublished: true,
        },
      },
    });
  },
};
