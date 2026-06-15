import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseFaq, ReplaceFaqItemsPayload } from "../types";
import {
  getHouseFaq,
  mapItemsForSnapshot,
  normalizeFaqItems,
  readFaqId,
  readLockVersion,
} from "./shared";

export const replaceItemsCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const faqId = readFaqId(rawPayload);
    if (!faqId.ok) return faqId;

    const lockResult = readLockVersion(rawPayload);
    if (!lockResult.ok) return err(lockResult.error, "VALIDATION_FAILED");

    const payload = rawPayload as Partial<ReplaceFaqItemsPayload>;
    const items = normalizeFaqItems(payload.items);

    if (items.length < 1) {
      return err("Додайте щонайменше одне питання та відповідь.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReplaceFaqItemsPayload;
    const items = normalizeFaqItems(payload.items);

    const beforeResult = await getHouseFaq(ctx, payload.faqId);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    const { data, error } = await ctx.supabase.rpc("replace_house_faq_items_by_id", {
      p_house_id: ctx.house.id,
      p_faq_id: payload.faqId,
      p_lock_version: payload.lockVersion,
      p_items: items,
    });

    if (error) {
      if (error.message.includes("STALE_CONTENT")) {
        return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
      }

      if (error.message.includes("FAQ_NOT_FOUND")) {
        return err("FAQ не знайдено.", "NOT_FOUND");
      }

      if (error.message.includes("FAQ_ARCHIVED")) {
        return err("Архівний FAQ не можна редагувати.", "VALIDATION_FAILED");
      }

      return err(error.message, "INTERNAL");
    }

    const faq = data as HouseFaq;

    return ok({
      data: faq,
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "items_replaced",
        description: "Оновлено питання та відповіді FAQ будинку.",
        beforeSnapshot: before,
        afterSnapshot: {
          ...faq,
          items: mapItemsForSnapshot(items),
        },
        metadata: {
          subSectionKey: "faq",
          itemsCount: items.length,
        },
      },
    });
  },
};
