import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  normalizeSpecialistPhones,
  validateSpecialistPhones,
} from "@/src/modules/houses/utils/specialistPhone";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  type HouseSpecialist,
  type HouseSpecialistPhoneType,
  type SpecialistIdAndLock,
} from "../types";

// Track 6: multi-category support. Accepts either the new `categories`
// array or the legacy singular `category` string (treated as a one-item
// array) so existing callers keep working unmodified.
export function normalizeCategoryTitles(payload: {
  categories?: unknown;
  category?: unknown;
}): string[] {
  const fromArray = Array.isArray(payload.categories)
    ? payload.categories.map((title) => normalizeText(title)).filter(Boolean)
    : [];

  if (fromArray.length > 0) {
    return fromArray.filter((title, index, array) => {
      const key = title.toLowerCase();
      return array.findIndex((item) => item.toLowerCase() === key) === index;
    });
  }

  const single = normalizeText(payload.category);
  return single ? [single] : [];
}

// Get-or-create each category title in the house's own catalog (never reuses
// a category id from a different house), returning ids in the same order as
// the input titles. This is what lets an operator type a brand-new category
// name (or pick one of the always-offered defaults that isn't a catalog row
// yet) directly from the specialist form, exactly like the legacy scalar
// `category` field already allowed.
export async function resolveSpecialistCategoryIds(
  ctx: HandlerContext,
  houseId: string,
  titles: string[],
): Promise<Result<string[]>> {
  if (titles.length === 0) {
    return ok([]);
  }

  const { data: existingRows, error: existingError } = await ctx.supabase
    .from("house_specialists_categories")
    .select("id, title, sort_order")
    .eq("house_id", houseId);

  if (existingError) {
    return err(existingError.message, "INTERNAL");
  }

  const existing = (existingRows ?? []) as Array<{ id: string; title: string; sort_order: number }>;
  const byLowerTitle = new Map(existing.map((row) => [row.title.toLowerCase(), row]));
  const maxSortOrder = existing.reduce((max, row) => Math.max(max, row.sort_order), -1);

  const missingTitles = titles.filter((title) => !byLowerTitle.has(title.toLowerCase()));

  if (missingTitles.length > 0) {
    const { data: createdRows, error: createError } = await ctx.supabase
      .from("house_specialists_categories")
      .insert(
        missingTitles.map((title, index) => ({
          house_id: houseId,
          title,
          sort_order: maxSortOrder + 1 + index,
        })),
      )
      .select("id, title, sort_order");

    if (createError) {
      return err(createError.message, "INTERNAL");
    }

    for (const row of (createdRows ?? []) as Array<{ id: string; title: string; sort_order: number }>) {
      byLowerTitle.set(row.title.toLowerCase(), row);
    }
  }

  const ids: string[] = [];
  for (const title of titles) {
    const row = byLowerTitle.get(title.toLowerCase());
    if (row) {
      ids.push(row.id);
    }
  }

  return ok(ids);
}

// Replaces a specialist's full set of category links in one call: delete
// what's there, insert the new ordered set. Simpler and safe here (unlike
// categoriesUpsertCommand's catalog-wide diff) because this only ever
// touches ONE specialist's own join rows, never another specialist's.
export async function replaceSpecialistCategoryLinks(
  ctx: HandlerContext,
  params: { houseId: string; specialistId: string; categoryIds: string[] },
): Promise<Result<void>> {
  const { error: deleteError } = await ctx.supabase
    .from("house_specialist_categories")
    .delete()
    .eq("specialist_id", params.specialistId);

  if (deleteError) {
    return err(deleteError.message, "INTERNAL");
  }

  if (params.categoryIds.length === 0) {
    return ok(undefined);
  }

  const { error: insertError } = await ctx.supabase
    .from("house_specialist_categories")
    .insert(
      params.categoryIds.map((categoryId, index) => ({
        house_id: params.houseId,
        specialist_id: params.specialistId,
        category_id: categoryId,
        sort_order: index,
      })),
    );

  if (insertError) {
    return err(insertError.message, "INTERNAL");
  }

  return ok(undefined);
}

export type SpecialistCategoryLinkRow = {
  specialist_id: string;
  category_id: string;
  sort_order: number;
  house_specialists_categories: { title: string } | null;
};

// Bulk-loads category titles for every specialist in a house, in stable
// (sort_order) order, for the admin/public loaders to merge into their
// snapshots without an N+1 query per specialist.
export async function loadSpecialistCategoryTitlesByHouse(
  ctx: HandlerContext,
  houseId: string,
): Promise<Result<Map<string, string[]>>> {
  const { data, error } = await ctx.supabase
    .from("house_specialist_categories")
    .select("specialist_id, category_id, sort_order, house_specialists_categories(title)")
    .eq("house_id", houseId)
    .order("sort_order", { ascending: true });

  if (error) {
    return err(error.message, "INTERNAL");
  }

  const map = new Map<string, string[]>();
  for (const row of (data ?? []) as unknown as SpecialistCategoryLinkRow[]) {
    const title = row.house_specialists_categories?.title;
    if (!title) continue;
    const list = map.get(row.specialist_id) ?? [];
    list.push(title);
    map.set(row.specialist_id, list);
  }

  return ok(map);
}

export { HOUSE_SPECIALIST_ENTITY_TYPE };

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value: unknown) {
  return normalizeText(value);
}

export function normalizePhones(value: unknown) {
  return normalizeSpecialistPhones(value);
}

export function validatePhones(value: unknown) {
  return validateSpecialistPhones(value);
}

export function normalizePhoneType(value: unknown): HouseSpecialistPhoneType {
  return value === "landline" || value === "free" ? value : "mobile";
}

export function normalizePhoneTypes(value: unknown, phones: string[]) {
  const rawTypes = Array.isArray(value) ? value : [];

  return phones.map((_, index) => normalizePhoneType(rawTypes[index]));
}

export function normalizeSortOrder(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function readIdAndLock(rawPayload: unknown): Result<SpecialistIdAndLock> {
  const payload = rawPayload as Partial<SpecialistIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID спеціаліста.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію спеціаліста.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getSpecialist(
  ctx: HandlerContext,
  id: string,
): Promise<Result<HouseSpecialist>> {
  const { data, error } = await ctx.supabase
    .from("house_specialists")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Спеціаліста не знайдено.", "NOT_FOUND");
  }

  return ok(data as HouseSpecialist);
}

export function publicSpecialistsPaths(houseSlug: string) {
  return [`/house/${houseSlug}/specialists`];
}

export function specialistHistoryMetadata(extra?: Record<string, unknown>) {
  return {
    subSectionKey: "specialists",
    ...extra,
  };
}

export function specialistTaskTitle(specialist: HouseSpecialist) {
  return specialist.title || "Спеціаліст";
}
