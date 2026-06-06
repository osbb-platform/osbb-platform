import type { CommandSpec } from "../../../types/handler";
import { ok } from "../../../types/result";
import {
  debtorsHistoryMetadata,
  getDebtorsItems,
  HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
  publicDebtorsPaths,
} from "./shared";
import { err } from "../../../types/result";

export const deleteDraftCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(_rawPayload, ctx) {
    const beforeResult = await getDebtorsItems(ctx, ["draft"]);
    if (!beforeResult.ok) return beforeResult;

    const { error } = await ctx.supabase
      .from("house_debtors_items")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "draft");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    return ok({
      data: [],
      history: {
        entityType: HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "draft.deleted",
        description: "Видалено чернетку списку боржників.",
        beforeSnapshot: beforeResult.data,
        afterSnapshot: [],
        metadata: debtorsHistoryMetadata({
          itemsCount: beforeResult.data.length,
        }),
      },
      extraRevalidatePaths: publicDebtorsPaths(ctx.house.slug),
    });
  },
};
