import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HomeWidget, HouseHomeWidgets, SaveHomeWidgetsPayload } from "../types";

function normalizeWidget(item: unknown): HomeWidget | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim().slice(0, 30) : "";
  const value = typeof record.value === "string" ? record.value.trim() : "";

  if (!label || !value) {
    return null;
  }

  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : `widget-${label}-${value}`;

  return {
    id,
    label,
    value,
  };
}

function normalizeWidgets(value: unknown): HomeWidget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeWidget)
    .filter((item): item is HomeWidget => item !== null)
    .slice(0, 6);
}

export const saveCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<SaveHomeWidgetsPayload>;

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію показників головної сторінки.", "VALIDATION_FAILED");
    }

    const widgets = normalizeWidgets(payload.statusWidgets);

    if (widgets.length < 1) {
      return err(
        "Заповніть щонайменше 1 показник, щоб зберегти блок.",
        "VALIDATION_FAILED",
      );
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SaveHomeWidgetsPayload;
    const statusWidgets = normalizeWidgets(payload.statusWidgets);

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_home_widgets")
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
        .from("house_home_widgets")
        .insert({
          house_id: ctx.house.id,
          status_widgets: statusWidgets,
          lock_version: 1,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return err(error.message, "INTERNAL");
      }

      const widgets = created as HouseHomeWidgets;

      return ok({
        data: widgets,
        history: {
          entityType: "house_home_widgets",
          entityId: widgets.id,
          action: "created",
          description: "Створено показники головної сторінки будинку.",
          beforeSnapshot: null,
          afterSnapshot: widgets,
          metadata: {
            subSectionKey: "home_widgets",
          },
        },
      });
    }

    const current = existing as HouseHomeWidgets;

    const { data: updated, error } = await ctx.supabase
      .from("house_home_widgets")
      .update({
        status_widgets: statusWidgets,
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

    const widgets = updated as HouseHomeWidgets;

    return ok({
      data: widgets,
      history: {
        entityType: "house_home_widgets",
        entityId: widgets.id,
        action: "updated",
        description: "Оновлено показники головної сторінки будинку.",
        beforeSnapshot: current,
        afterSnapshot: widgets,
        metadata: {
          subSectionKey: "home_widgets",
        },
      },
    });
  },
};
