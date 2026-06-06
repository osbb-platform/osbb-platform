import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { FaqLockPayload, HouseFaq } from "../types";
import { getHouseFaq, readLockVersion } from "./shared";

export const publishCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const lockResult = readLockVersion(rawPayload);

    if (!lockResult.ok) {
      return lockResult;
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as FaqLockPayload;
    const beforeResult = await getHouseFaq(ctx);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_faq")
      .update({
        lifecycle_status: "published",
        published_at: before.published_at ?? now,
        archived_at: null,
        lock_version: payload.lockVersion + 1,
        updated_at: now,
      })
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

    const faq = data as HouseFaq;

    return ok({
      data: faq,
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "published",
        description: "Опубліковано FAQ будинку.",
        beforeSnapshot: before,
        afterSnapshot: faq,
        metadata: {
          subSectionKey: "faq",
        },
      },
    });
  },
};
