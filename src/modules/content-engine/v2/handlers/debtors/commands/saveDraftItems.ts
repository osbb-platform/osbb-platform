import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseDebtorsItem, SaveDebtorsDraftItemsPayload } from "../types";
import {
  debtorsHistoryMetadata,
  getDebtorsItems,
  HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
  normalizeDraftItems,
  publicDebtorsPaths,
} from "./shared";

export const saveDraftItemsCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<SaveDebtorsDraftItemsPayload>;
    const items = normalizeDraftItems(payload.items);

    if (items.length === 0) {
      return err("Додайте хоча б одну квартиру з боргом.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SaveDebtorsDraftItemsPayload;
    const beforeResult = await getDebtorsItems(ctx, ["draft"]);
    if (!beforeResult.ok) return beforeResult;

    const items = normalizeDraftItems(payload.items);
    const now = new Date().toISOString();

    const deleteResult = await ctx.supabase
      .from("house_debtors_items")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "draft");

    if (deleteResult.error) {
      return err(deleteResult.error.message, "INTERNAL");
    }

    const { data, error } = await ctx.supabase
      .from("house_debtors_items")
      .insert(
        items.map((item) => ({
          house_id: ctx.house.id,
          apartment_id: item.apartmentId ?? null,
          apartment_label: item.apartmentLabel,
          account_number: item.accountNumber ?? "",
          owner_name: item.ownerName ?? "",
          area: item.area ?? null,
          amount: item.amount,
          days: item.days ?? "",
          lifecycle_status: "draft",
          created_at: now,
          updated_at: now,
        })),
      )
      .select("*");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const draftItems = (data ?? []) as HouseDebtorsItem[];

    return ok({
      data: draftItems,
      history: {
        entityType: HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "draft.saved",
        description: "Оновлено чернетку списку боржників.",
        beforeSnapshot: beforeResult.data,
        afterSnapshot: draftItems,
        metadata: debtorsHistoryMetadata({
          itemsCount: draftItems.length,
        }),
      },
      extraRevalidatePaths: publicDebtorsPaths(ctx.house.slug),
    });
  },
};
