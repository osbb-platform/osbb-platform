import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityScope } from "@/src/modules/auth/services/getAdminCityScope";
import {
  getDateKey,
  getHourKey,
  getSafeAnalyticsFilter,
} from "@/src/modules/analytics/services/date";
import {
  EMPTY_ACCESS,
  type AnalyticsAccess,
  type AnalyticsAccessDailyPoint,
  type AnalyticsAccessHourPoint,
  type AnalyticsFilter,
  type HouseVisitorEventRow,
} from "@/src/modules/analytics/services/types";

function getDailyBucket(map: Map<string, AnalyticsAccessDailyPoint>, date: string) {
  const existing = map.get(date);

  if (existing) {
    return existing;
  }

  const created = {
    date,
    success: 0,
    fail: 0,
  };

  map.set(date, created);
  return created;
}

function getHourBucket(map: Map<number, AnalyticsAccessHourPoint>, hour: number) {
  const existing = map.get(hour);

  if (existing) {
    return existing;
  }

  const created = {
    hour,
    success: 0,
    fail: 0,
    total: 0,
  };

  map.set(hour, created);
  return created;
}

export async function getAnalyticsAccess(
  filter: AnalyticsFilter,
): Promise<AnalyticsAccess> {
  noStore();

  try {
    const safeFilter = getSafeAnalyticsFilter(filter);
    const [supabase, cityScope] = await Promise.all([
      createSupabaseServerClient(),
      getAdminCityScope(),
    ]);

    if (!cityScope || cityScope.houseIds.length === 0) {
      return EMPTY_ACCESS;
    }

    let query = supabase
      .from("house_visitor_events")
      .select("id, occurred_at, house_id, session_id, event_type, section_key")
      .in("event_type", ["password_success", "password_fail"])
      .gte("occurred_at", safeFilter.from)
      .lte("occurred_at", safeFilter.to);

    if (safeFilter.houseId) {
      if (!cityScope.houseIds.includes(safeFilter.houseId)) { return EMPTY_ACCESS; }
      query = query.eq("house_id", safeFilter.houseId);
    } else {
      query = query.in("house_id", cityScope.houseIds);
    }

    const { data, error } = await query.order("occurred_at", {
      ascending: true,
    });

    if (error) {
      console.error("getAnalyticsAccess error:", error.message);
      return EMPTY_ACCESS;
    }

    const dailyMap = new Map<string, AnalyticsAccessDailyPoint>();
    const hourMap = new Map<number, AnalyticsAccessHourPoint>();

    for (const row of (data ?? []) as HouseVisitorEventRow[]) {
      const dateKey = getDateKey(row.occurred_at);
      const daily = dateKey ? getDailyBucket(dailyMap, dateKey) : null;
      const hourly = getHourBucket(hourMap, getHourKey(row.occurred_at));

      if (row.event_type === "password_success") {
        if (daily) daily.success += 1;
        hourly.success += 1;
      }

      if (row.event_type === "password_fail") {
        if (daily) daily.fail += 1;
        hourly.fail += 1;
      }

      hourly.total += 1;
    }

    return {
      daily: Array.from(dailyMap.values()).sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
      hourly: Array.from(hourMap.values()).sort(
        (left, right) => right.total - left.total,
      ),
    };
  } catch (error) {
    console.error("getAnalyticsAccess crash:", error);
    return EMPTY_ACCESS;
  }
}
