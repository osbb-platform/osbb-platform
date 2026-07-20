import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { AdminHousePageListItem } from "@/src/modules/houses/services/getAdminHousePages";

export type AdminDashboardApartmentCountItem = {
  house_id: string;
  active_count: number;
};

const DASHBOARD_BATCH_PAGE_SIZE = 1000;

export async function getAdminHousePagesByHouseIds(
  houseIds: string[],
): Promise<AdminHousePageListItem[]> {
  noStore();

  const safeHouseIds = Array.from(new Set(houseIds.filter(Boolean)));

  if (safeHouseIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const rows: AdminHousePageListItem[] = [];
  let from = 0;

  while (true) {
    const to = from + DASHBOARD_BATCH_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("house_pages")
      .select("id, house_id, slug, title, status, created_at, updated_at")
      .in("house_id", safeHouseIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load dashboard house pages: ${error.message}`);
    }

    const pageRows = (data ?? []) as AdminHousePageListItem[];
    rows.push(...pageRows);

    if (pageRows.length < DASHBOARD_BATCH_PAGE_SIZE) {
      break;
    }

    from += DASHBOARD_BATCH_PAGE_SIZE;
  }

  return rows;
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
  const counts = new Map<string, number>();
  let from = 0;

  while (true) {
    const to = from + DASHBOARD_BATCH_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("house_apartments")
      .select("id, house_id")
      .in("house_id", safeHouseIds)
      .is("archived_at", null)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load dashboard apartment counts: ${error.message}`);
    }

    const pageRows = (data ?? []) as Array<{
      id: string;
      house_id: string | null;
    }>;

    for (const row of pageRows) {
      if (!row.house_id) {
        continue;
      }

      counts.set(row.house_id, (counts.get(row.house_id) ?? 0) + 1);
    }

    if (pageRows.length < DASHBOARD_BATCH_PAGE_SIZE) {
      break;
    }

    from += DASHBOARD_BATCH_PAGE_SIZE;
  }

  return counts;
}
