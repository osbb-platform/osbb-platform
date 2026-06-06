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

    const { error: deleteError } = await ctx.supabase
      .from("house_specialists_categories")
      .delete()
      .eq("house_id", ctx.house.id);

    if (deleteError) {
      return err(deleteError.message, "INTERNAL");
    }

    const insertRows = normalized.map((category) => ({
      ...(category.id ? { id: category.id } : {}),
      house_id: category.house_id,
      title: category.title,
      sort_order: category.sort_order,
    }));

    let after: HouseSpecialistCategory[] = [];

    if (insertRows.length > 0) {
      const { data, error } = await ctx.supabase
        .from("house_specialists_categories")
        .insert(insertRows)
        .select("*");

      if (error) {
        return err(error.message, "INTERNAL");
      }

      after = (data ?? []) as HouseSpecialistCategory[];
    }

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
