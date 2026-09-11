import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type {
  CategoriesUpsertSpecialistsPayload,
  HouseSpecialistCategory,
} from "../types";
import {
  normalizeSortOrder,
  normalizeText,
  publicSpecialistsPaths,
  specialistHistoryMetadata,
} from "./shared";

export const categoriesUpsertCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CategoriesUpsertSpecialistsPayload>;

    if (!Array.isArray(payload.categories)) {
      return err("Не передано каталог категорій.", "VALIDATION_FAILED");
    }

    const hasInvalid = payload.categories.some((category) => !category.title?.trim());
    if (hasInvalid) {
      return err("Назва категорії не може бути порожньою.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CategoriesUpsertSpecialistsPayload;

    const normalized = payload.categories
      .map((category, index) => ({
        id: normalizeText(category.id),
        house_id: ctx.house.id,
        title: normalizeText(category.title),
        sort_order:
          typeof category.sortOrder === "number"
            ? normalizeSortOrder(category.sortOrder)
            : index,
      }))
      .filter((category, index, array) => {
        const key = category.title.toLowerCase();
        return category.title && array.findIndex((item) => item.title.toLowerCase() === key) === index;
      });

    const { data: beforeData, error: beforeError } = await ctx.supabase
      .from("house_specialists_categories")
      .select("*")
      .eq("house_id", ctx.house.id)
      .order("sort_order", { ascending: true });

    if (beforeError) {
      return err(beforeError.message, "INTERNAL");
    }

    const before = (beforeData ?? []) as HouseSpecialistCategory[];

    // Diff-based upsert, not delete-all-then-reinsert: house_specialist_categories
    // (Track 6 M:N join table) has an ON DELETE CASCADE FK into this table, so
    // deleting and immediately re-inserting a category — even with the same id —
    // would silently drop every specialist's link to it in between the two
    // statements. Only categories the admin actually removed get deleted here.
    const keptIds = new Set(normalized.filter((c) => c.id).map((c) => c.id));
    const idsToDelete = before
      .map((category) => category.id)
      .filter((id) => !keptIds.has(id));

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await ctx.supabase
        .from("house_specialists_categories")
        .delete()
        .eq("house_id", ctx.house.id)
        .in("id", idsToDelete);

      if (deleteError) {
        return err(deleteError.message, "INTERNAL");
      }
    }

    const toUpdate = normalized.filter((c) => c.id);
    const toInsert = normalized.filter((c) => !c.id);

    for (const category of toUpdate) {
      const { error: updateError } = await ctx.supabase
        .from("house_specialists_categories")
        .update({ title: category.title, sort_order: category.sort_order })
        .eq("id", category.id)
        .eq("house_id", ctx.house.id);

      if (updateError) {
        return err(updateError.message, "INTERNAL");
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await ctx.supabase
        .from("house_specialists_categories")
        .insert(
          toInsert.map((category) => ({
            house_id: category.house_id,
            title: category.title,
            sort_order: category.sort_order,
          })),
        );

      if (insertError) {
        return err(insertError.message, "INTERNAL");
      }
    }

    const { data: afterData, error: afterError } = await ctx.supabase
      .from("house_specialists_categories")
      .select("*")
      .eq("house_id", ctx.house.id)
      .order("sort_order", { ascending: true });

    if (afterError) {
      return err(afterError.message, "INTERNAL");
    }

    const after = (afterData ?? []) as HouseSpecialistCategory[];

    return ok({
      data: after,
      history: {
        entityType: "house_specialists_categories",
        entityId: ctx.house.id,
        action: "updated",
        description: "Оновлено каталог категорій спеціалістів.",
        beforeSnapshot: before,
        afterSnapshot: after,
        metadata: specialistHistoryMetadata({
          categoriesCount: after.length,
        }),
      },
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
