import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HouseSpecialist,
  HouseSpecialistCategory,
  HouseSpecialistLifecycle,
  HouseSpecialistPhoneType,
} from "@/src/modules/content-engine/v2/handlers/specialists";

type SpecialistCategoryLinkRow = {
  specialist_id: string;
  house_specialists_categories: { title: string } | null;
};

export async function loadSpecialistCategoriesBySpecialistId(
  // Untyped on purpose: shared by the admin (server, cookie-scoped) and
  // public (anon) Supabase clients, which have distinct wrapper types.
  supabase: SupabaseClient,
  houseId: string,
): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from("house_specialist_categories")
    .select("specialist_id, sort_order, house_specialists_categories(title)")
    .eq("house_id", houseId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load specialist category links:", error.message);
    return new Map();
  }

  const map = new Map<string, string[]>();
  for (const row of (data ?? []) as unknown as SpecialistCategoryLinkRow[]) {
    const title = row.house_specialists_categories?.title;
    if (!title) continue;
    const list = map.get(row.specialist_id) ?? [];
    list.push(title);
    map.set(row.specialist_id, list);
  }
  return map;
}

export type HouseSpecialistSnapshot = {
  id: string;
  title: string;
  status: HouseSpecialistLifecycle;
  lockVersion: number;
  content: {
    title: string;
    category: string;
    // Full multi-category set (Track 6). Falls back to [category] when the
    // join table has no rows yet for this specialist (should not happen
    // post-backfill, but keeps old snapshots/tests that only ever set
    // `category` rendering something sensible).
    categories: string[];
    phones: string[];
    phoneTypes: HouseSpecialistPhoneType[];
    email: string;
    description: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    archivedAt: string | null;
    lockVersion: number;
  };
};

export type HouseSpecialistsCategorySnapshot = {
  id: string;
  title: string;
  sortOrder: number;
};

export type AdminHouseSpecialistsSnapshot = {
  specialists: HouseSpecialistSnapshot[];
  categories: HouseSpecialistsCategorySnapshot[];
};

function normalizePhones(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((phone) => String(phone ?? "").trim())
    .filter(Boolean)
    .filter((phone, index, array) => array.indexOf(phone) === index);
}

function normalizePhoneType(value: unknown): HouseSpecialistPhoneType {
  return value === "landline" || value === "free" ? value : "mobile";
}

function normalizePhoneTypes(value: unknown, phones: string[]) {
  const rawTypes = Array.isArray(value) ? value : [];

  return phones.map((_, index) => normalizePhoneType(rawTypes[index]));
}

export function mapHouseSpecialist(
  specialist: HouseSpecialist,
  categories?: string[],
): HouseSpecialistSnapshot {
  const phones = normalizePhones(specialist.phones);
  const resolvedCategories =
    categories && categories.length > 0
      ? categories
      : specialist.category
        ? [specialist.category]
        : [];

  return {
    id: specialist.id,
    title: specialist.title,
    status: specialist.lifecycle_status,
    lockVersion: specialist.lock_version,
    content: {
      title: specialist.title,
      category: specialist.category,
      categories: resolvedCategories,
      phones,
      phoneTypes: normalizePhoneTypes(specialist.phone_types, phones),
      email: specialist.email,
      description: specialist.description,
      sortOrder: specialist.sort_order,
      createdAt: specialist.created_at,
      updatedAt: specialist.updated_at,
      publishedAt: specialist.published_at,
      archivedAt: specialist.archived_at,
      lockVersion: specialist.lock_version,
    },
  };
}

export function mapHouseSpecialistCategory(
  category: HouseSpecialistCategory,
): HouseSpecialistsCategorySnapshot {
  return {
    id: category.id,
    title: category.title,
    sortOrder: category.sort_order,
  };
}

export async function getAdminHouseSpecialists(params: {
  houseId: string;
}): Promise<AdminHouseSpecialistsSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const [specialistsResult, categoriesResult] = await Promise.all([
    supabase
      .from("house_specialists")
      .select("*")
      .eq("house_id", params.houseId)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    supabase
      .from("house_specialists_categories")
      .select("*")
      .eq("house_id", params.houseId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  if (specialistsResult.error) {
    console.error(
      "Failed to load admin specialists:",
      specialistsResult.error.message,
    );
  }

  if (categoriesResult.error) {
    console.error(
      "Failed to load admin specialist categories:",
      categoriesResult.error.message,
    );
  }

  const categoriesBySpecialistId = await loadSpecialistCategoriesBySpecialistId(
    supabase,
    params.houseId,
  );

  return {
    specialists: ((specialistsResult.data ?? []) as unknown as HouseSpecialist[]).map(
      (specialist) => mapHouseSpecialist(specialist, categoriesBySpecialistId.get(specialist.id)),
    ),
    categories: ((categoriesResult.data ?? []) as unknown as HouseSpecialistCategory[]).map(
      mapHouseSpecialistCategory,
    ),
  };
}
