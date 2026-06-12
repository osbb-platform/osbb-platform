import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HouseSpecialist,
  HouseSpecialistCategory,
  HouseSpecialistLifecycle,
  HouseSpecialistPhoneType,
} from "@/src/modules/content-engine/v2/handlers/specialists";

export type HouseSpecialistSnapshot = {
  id: string;
  title: string;
  status: HouseSpecialistLifecycle;
  lockVersion: number;
  content: {
    title: string;
    category: string;
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
  return value === "landline" || value === "free" || value === "other"
    ? value
    : "mobile";
}

function normalizePhoneTypes(value: unknown, phones: string[]) {
  const rawTypes = Array.isArray(value) ? value : [];

  return phones.map((_, index) => normalizePhoneType(rawTypes[index]));
}

export function mapHouseSpecialist(
  specialist: HouseSpecialist,
): HouseSpecialistSnapshot {
  const phones = normalizePhones(specialist.phones);

  return {
    id: specialist.id,
    title: specialist.title,
    status: specialist.lifecycle_status,
    lockVersion: specialist.lock_version,
    content: {
      title: specialist.title,
      category: specialist.category,
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

  return {
    specialists: ((specialistsResult.data ?? []) as unknown as HouseSpecialist[]).map(
      mapHouseSpecialist,
    ),
    categories: ((categoriesResult.data ?? []) as unknown as HouseSpecialistCategory[]).map(
      mapHouseSpecialistCategory,
    ),
  };
}
