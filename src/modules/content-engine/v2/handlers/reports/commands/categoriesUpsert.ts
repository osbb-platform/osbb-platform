import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type {
  CategoriesUpsertReportsPayload,
  HouseReportCategory,
} from "../types";
import {
  HOUSE_REPORT_CATEGORY_ENTITY_TYPE,
  normalizeSortOrder,
  normalizeText,
  publicReportPaths,
  reportHistoryMetadata,
} from "./shared";

export const categoriesUpsertCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CategoriesUpsertReportsPayload>;

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
    const payload = rawPayload as CategoriesUpsertReportsPayload;

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
      .from("house_report_categories")
      .select("*")
      .eq("house_id", ctx.house.id)
      .order("sort_order", { ascending: true });

    if (beforeError) {
      return err(beforeError.message, "INTERNAL");
    }

    const before = (beforeData ?? []) as HouseReportCategory[];

    const { error: deleteError } = await ctx.supabase
      .from("house_report_categories")
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

    let after: HouseReportCategory[] = [];

    if (insertRows.length > 0) {
      const { data, error } = await ctx.supabase
        .from("house_report_categories")
        .insert(insertRows)
        .select("*");

      if (error) {
        return err(error.message, "INTERNAL");
      }

      after = (data ?? []) as HouseReportCategory[];
    }

    return ok({
      data: after,
      history: {
        entityType: HOUSE_REPORT_CATEGORY_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "updated",
        description: "Оновлено каталог категорій звітів.",
        beforeSnapshot: before,
        afterSnapshot: after,
        metadata: reportHistoryMetadata({
          categoriesCount: after.length,
        }),
      },
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
