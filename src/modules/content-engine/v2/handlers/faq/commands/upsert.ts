import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { FaqLockPayload, HouseFaq } from "../types";
import { readFaqId, readLockVersion } from "./shared";

export const upsertCommand: CommandSpec = {
  actionKey: "edit",
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
    const now = new Date().toISOString();

    const { data: before, error: beforeError } = await ctx.supabase
      .from("house_faq")
      .select("*")
      .eq("house_id", ctx.house.id)
      .eq("id", payload.faqId)
      .maybeSingle();

    if (beforeError) {
      return err(beforeError.message, "INTERNAL");
    }

    if (!before) {
      return err("FAQ не знайдено.", "NOT_FOUND");
    }

    const { data, error } = await ctx.supabase
      .from("house_faq")
      .update({
        lifecycle_status: "draft",
        lock_version: payload.lockVersion + 1,
        updated_at: now,
        archived_at: null,
      })
      .eq("house_id", ctx.house.id)
      .eq("id", payload.faqId)
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
        action: "updated",
        description: "Оновлено статус FAQ будинку до чернетки.",
        beforeSnapshot: before,
        afterSnapshot: faq,
        metadata: {
          subSectionKey: "faq",
        },
      },
    });
  },
};
