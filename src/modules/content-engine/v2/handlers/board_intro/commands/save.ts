import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseBoardIntro, SaveBoardIntroPayload } from "../types";

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const saveCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<SaveBoardIntroPayload>;

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію вступного тексту правління.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SaveBoardIntroPayload;

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_board_intro")
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
        .from("house_board_intro")
        .insert({
          house_id: ctx.house.id,
          intro: normalizeText(payload.intro),
          lock_version: 1,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return err(error.message, "INTERNAL");
      }

      const intro = created as HouseBoardIntro;

      return ok({
        data: intro,
        history: {
          entityType: "house_board_intro",
          entityId: intro.id,
          action: "created",
          description: "Створено вступний текст правління.",
          beforeSnapshot: null,
          afterSnapshot: intro,
          metadata: {
            subSectionKey: "board",
          },
        },
      });
    }

    const current = existing as HouseBoardIntro;

    const { data: updated, error } = await ctx.supabase
      .from("house_board_intro")
      .update({
        intro: normalizeText(payload.intro),
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

    const intro = updated as HouseBoardIntro;

    return ok({
      data: intro,
      history: {
        entityType: "house_board_intro",
        entityId: intro.id,
        action: "updated",
        description: "Оновлено вступний текст правління.",
        beforeSnapshot: current,
        afterSnapshot: intro,
        metadata: {
          subSectionKey: "board",
        },
      },
    });
  },
};
