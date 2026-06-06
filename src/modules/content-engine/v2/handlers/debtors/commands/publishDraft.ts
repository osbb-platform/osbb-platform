import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  debtorsHistoryMetadata,
  getDebtorsItems,
  HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
  publicDebtorsPaths,
} from "./shared";

export const publishDraftCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: false,

  async validate(_rawPayload, ctx) {
    const draftResult = await getDebtorsItems(ctx, ["draft"]);
    if (!draftResult.ok) return draftResult;

    if (draftResult.data.length === 0) {
      return err("Чернетка боржників порожня.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(_rawPayload, ctx) {
    const beforeResult = await getDebtorsItems(ctx, ["draft", "published"]);
    if (!beforeResult.ok) return beforeResult;

    const { error } = await ctx.supabase.rpc("publish_house_debtors_draft", {
      p_house_id: ctx.house.id,
    });

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const afterResult = await getDebtorsItems(ctx, ["published"]);
    if (!afterResult.ok) return afterResult;

    return ok({
      data: afterResult.data,
      history: {
        entityType: HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "published",
        description: "Опубліковано новий список боржників.",
        beforeSnapshot: beforeResult.data,
        afterSnapshot: afterResult.data,
        metadata: debtorsHistoryMetadata({
          itemsCount: afterResult.data.length,
        }),
      },
      extraRevalidatePaths: publicDebtorsPaths(ctx.house.slug),
    });
  },
};
