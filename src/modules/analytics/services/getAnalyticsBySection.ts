import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityScope } from "@/src/modules/auth/services/getAdminCityScope";
import { getSafeAnalyticsFilter } from "@/src/modules/analytics/services/date";
import type {
  AnalyticsFilter,
  AnalyticsSectionItem,
} from "@/src/modules/analytics/services/types";

type SectionRow = {
  section_key: string | null;
};

export async function getAnalyticsBySection(
  filter: AnalyticsFilter,
): Promise<AnalyticsSectionItem[]> {
  noStore();

  try {
    const safeFilter = getSafeAnalyticsFilter(filter);
    const [supabase, cityScope] = await Promise.all([
      createSupabaseServerClient(),
      getAdminCityScope(),
    ]);

    if (!cityScope || cityScope.houseIds.length === 0) {
      return [];
    }

    let query = supabase
      .from("house_visitor_events")
      .select("section_key")
      .eq("event_type", "section_view")
      .gte("occurred_at", safeFilter.from)
      .lte("occurred_at", safeFilter.to);

    if (safeFilter.houseId) {
      if (!cityScope.houseIds.includes(safeFilter.houseId)) { return []; }
      query = query.eq("house_id", safeFilter.houseId);
    } else {
      query = query.in("house_id", cityScope.houseIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("getAnalyticsBySection error:", error.message);
      return [];
    }

    const counts = new Map<string, number>();

    for (const row of (data ?? []) as SectionRow[]) {
      const key = row.section_key?.trim() || "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);

    return Array.from(counts.entries())
      .map(([sectionKey, views]) => ({
        sectionKey,
        views,
        share: total > 0 ? Math.round((views / total) * 100) : 0,
      }))
      .sort((left, right) => right.views - left.views);
  } catch (error) {
    console.error("getAnalyticsBySection crash:", error);
    return [];
  }
}
