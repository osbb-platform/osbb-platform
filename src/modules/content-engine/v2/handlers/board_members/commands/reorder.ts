import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseBoardMember, ReorderBoardMembersPayload } from "../types";

export const reorderCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<ReorderBoardMembersPayload>;

    if (!Array.isArray(payload.items)) {
      return err("Не передано порядок представників правління.", "VALIDATION_FAILED");
    }

    for (const item of payload.items) {
      if (!item?.id || typeof item.sortOrder !== "number") {
        return err("Некоректний порядок представників правління.", "VALIDATION_FAILED");
      }
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReorderBoardMembersPayload;

    const { data: before, error: beforeError } = await ctx.supabase
      .from("house_board_members")
      .select("*")
      .eq("house_id", ctx.house.id)
      .in(
        "id",
        payload.items.map((item) => item.id),
      );

    if (beforeError) {
      return err(beforeError.message, "INTERNAL");
    }

    const now = new Date().toISOString();

    for (const item of payload.items) {
      const { error } = await ctx.supabase
        .from("house_board_members")
        .update({
          sort_order: item.sortOrder,
          updated_at: now,
        })
        .eq("id", item.id)
        .eq("house_id", ctx.house.id);

      if (error) {
        return err(error.message, "INTERNAL");
      }
    }

    const { data: after, error: afterError } = await ctx.supabase
      .from("house_board_members")
      .select("*")
      .eq("house_id", ctx.house.id)
      .in(
        "id",
        payload.items.map((item) => item.id),
      )
      .order("sort_order", { ascending: true });

    if (afterError) {
      return err(afterError.message, "INTERNAL");
    }

    return ok({
      data: after ?? [],
      history: {
        entityType: "house_board_member",
        entityId: ctx.house.id,
        action: "reordered",
        description: "Оновлено порядок представників правління.",
        beforeSnapshot: (before ?? []) as HouseBoardMember[],
        afterSnapshot: (after ?? []) as HouseBoardMember[],
        metadata: {
          subSectionKey: "board",
          items: payload.items,
        },
      },
    });
  },
};
