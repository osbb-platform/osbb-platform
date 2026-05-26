import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { FaqLockPayload, HouseFaq } from "../types";
import { readLockVersion } from "./shared";

export const upsertCommand: CommandSpec = {
  actionKey: "edit",
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

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_faq")
      .select("*")
      .eq("house_id", ctx.house.id)
      .maybeSingle();

    if (existingError) {
      return err(existingError.message, "INTERNAL");
    }

    const now = new Date().toISOString();

    if (!existing) {
      if (payload.lockVersion !== 1) {
        return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
      }

      const { data: created, error } = await ctx.supabase
        .from("house_faq")
        .insert({
          house_id: ctx.house.id,
          lifecycle_status: "draft",
          lock_version: 1,
          created_at: now,
          updated_at: now,
          published_at: null,
          archived_at: null,
        })
        .select("*")
        .single();

      if (error) {
        return err(error.message, "INTERNAL");
      }

      const faq = created as HouseFaq;

      return ok({
        data: faq,
        history: {
          entityType: "house_faq",
          entityId: faq.id,
          action: "created",
          description: "Створено FAQ будинку.",
          beforeSnapshot: null,
          afterSnapshot: faq,
          metadata: {
            subSectionKey: "faq",
          },
        },
      });
    }

    const current = existing as HouseFaq;

    const { data: updated, error } = await ctx.supabase
      .from("house_faq")
      .update({
        lifecycle_status: "draft",
        lock_version: payload.lockVersion + 1,
        updated_at: now,
        published_at: null,
        archived_at: null,
      })
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!updated) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const faq = updated as HouseFaq;

    return ok({
      data: faq,
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "updated",
        description: "Оновлено статус FAQ будинку до чернетки.",
        beforeSnapshot: current,
        afterSnapshot: faq,
        metadata: {
          subSectionKey: "faq",
        },
      },
    });
  },
};
