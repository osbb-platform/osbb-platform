import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { AdminHousePageListItem } from "@/src/modules/houses/services/getAdminHousePages";
import type { AdminHouseSectionListItem } from "@/src/modules/houses/services/getAdminHouseSections";

export type AdminDashboardApartmentCountItem = {
  house_id: string;
  active_count: number;
};

export async function getAdminHousePagesByHouseIds(
  houseIds: string[],
): Promise<AdminHousePageListItem[]> {
  noStore();

  const safeHouseIds = Array.from(new Set(houseIds.filter(Boolean)));

  if (safeHouseIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select("id, house_id, slug, title, status, created_at, updated_at")
    .in("house_id", safeHouseIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load dashboard house pages: ${error.message}`);
  }

  return (data ?? []) as AdminHousePageListItem[];
}

export async function getAdminHouseSectionsByPageIds(
  pageIds: string[],
): Promise<AdminHouseSectionListItem[]> {
  noStore();

  const safePageIds = Array.from(new Set(pageIds.filter(Boolean)));

  if (safePageIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_sections")
    .select("id, house_page_id, kind, title, sort_order, status, created_at, updated_at")
    .in("house_page_id", safePageIds)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Dashboard: failed to load sections batch", {
      error: error.message,
    });

    return [];
  }

  return (data ?? []) as AdminHouseSectionListItem[];
}

export async function getAdminActiveApartmentCountsByHouseIds(
  houseIds: string[],
): Promise<Map<string, number>> {
  noStore();

  const safeHouseIds = Array.from(new Set(houseIds.filter(Boolean)));

  if (safeHouseIds.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_apartments")
    .select("house_id")
    .in("house_id", safeHouseIds)
    .is("archived_at", null);

  if (error) {
    throw new Error(`Failed to load dashboard apartment counts: ${error.message}`);
  }

  const counts = new Map<string, number>();

  for (const row of (data ?? []) as Array<{ house_id: string | null }>) {
    if (!row.house_id) {
      continue;
    }

    counts.set(row.house_id, (counts.get(row.house_id) ?? 0) + 1);
  }

  return counts;
}
