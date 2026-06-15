import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { FaqLockPayload, HouseFaq } from "../types";
import { readFaqId, readLockVersion } from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
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

    const { data, error } = await ctx.supabase
      .from("house_faq")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("id", payload.faqId)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) return err(error.message, "INTERNAL");
    if (!data) return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");

    const faq = data as HouseFaq;

    return ok({
      data: faq,
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "deleted",
        description: "Видалено FAQ будинку.",
        beforeSnapshot: faq,
        afterSnapshot: null,
        metadata: {
          subSectionKey: "faq",
        },
      },
      tasks: {
        delete: {
          entityType: "house_faq",
          entityId: faq.id,
        },
      },
    });
  },
};
