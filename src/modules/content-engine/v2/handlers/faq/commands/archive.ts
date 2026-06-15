import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { FaqLockPayload, HouseFaq } from "../types";
import { getHouseFaq, readFaqId, readLockVersion } from "./shared";

export const archiveCommand: CommandSpec = {
  actionKey: "archive",
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
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_faq")
      .update({
        lifecycle_status: "archived",
        archived_at: now,
        lock_version: payload.lockVersion + 1,
        updated_at: now,
      })
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
        action: "archived",
        description: "Перенесено FAQ будинку в архів.",
        beforeSnapshot: before,
        afterSnapshot: faq,
        metadata: {
          subSectionKey: "faq",
        },
      },
    });
  },
};
