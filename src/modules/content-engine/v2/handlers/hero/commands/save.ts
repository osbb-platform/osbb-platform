import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseHero, SaveHeroPayload } from "../types";

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeNullableText = (value: unknown) => {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
};

export const saveCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<SaveHeroPayload>;

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію hero секції.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SaveHeroPayload;

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_hero")
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
        .from("house_hero")
        .insert({
          house_id: ctx.house.id,
          headline: normalizeText(payload.headline),
          subheadline: normalizeText(payload.subheadline),
          cta_label: normalizeText(payload.ctaLabel) || "Відкрити оголошення",
          cover_image_url: normalizeNullableText(payload.coverImageUrl),
          lock_version: 1,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return err(error.message, "INTERNAL");
      }

      const hero = created as HouseHero;

      return ok({
        data: hero,
        history: {
          entityType: "house_hero",
          entityId: hero.id,
          action: "created",
          description: "Створено hero секцію будинку.",
          beforeSnapshot: null,
          afterSnapshot: hero,
          metadata: {
            subSectionKey: "hero",
          },
        },
      });
    }

    const current = existing as HouseHero;

    const { data: updated, error } = await ctx.supabase
      .from("house_hero")
      .update({
        headline: normalizeText(payload.headline),
        subheadline: normalizeText(payload.subheadline),
        cta_label: normalizeText(payload.ctaLabel) || "Відкрити оголошення",
        cover_image_url: normalizeNullableText(payload.coverImageUrl),
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

    if (!updated) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const hero = updated as HouseHero;

    return ok({
      data: hero,
      history: {
        entityType: "house_hero",
        entityId: hero.id,
        action: "updated",
        description: "Оновлено hero секцію будинку.",
        beforeSnapshot: current,
        afterSnapshot: hero,
        metadata: {
          subSectionKey: "hero",
        },
      },
    });
  },
};
