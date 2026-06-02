import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getDateKey, getSafeAnalyticsFilter } from "@/src/modules/analytics/services/date";
import {
  EMPTY_OVERVIEW,
  type AnalyticsDailyPoint,
  type AnalyticsFilter,
  type AnalyticsOverview,
  type AnalyticsTopHouse,
  type HouseVisitorEventRow,
} from "@/src/modules/analytics/services/types";

type HouseRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

function getDailyBucket(map: Map<string, AnalyticsDailyPoint>, date: string) {
  const existing = map.get(date);

  if (existing) {
    return existing;
  }

  const created: AnalyticsDailyPoint = {
    date,
    totalEvents: 0,
    visits: 0,
    sectionViews: 0,
    passwordSuccess: 0,
    passwordFail: 0,
    contactRequests: 0,
  };

  map.set(date, created);
  return created;
}

export async function getAnalyticsOverview(
  filter: AnalyticsFilter,
): Promise<AnalyticsOverview> {
  noStore();

  try {
    const safeFilter = getSafeAnalyticsFilter(filter);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("house_visitor_events")
      .select("id, occurred_at, house_id, session_id, event_type, section_key")
      .gte("occurred_at", safeFilter.from)
      .lte("occurred_at", safeFilter.to);

    if (safeFilter.houseId) {
      query = query.eq("house_id", safeFilter.houseId);
    }

    const { data, error } = await query.order("occurred_at", {
      ascending: true,
    });

    if (error) {
      console.error("getAnalyticsOverview error:", error.message);
      return EMPTY_OVERVIEW;
    }

    const rows = (data ?? []) as HouseVisitorEventRow[];
    const sessionIds = new Set<string>();
    const dailyMap = new Map<string, AnalyticsDailyPoint>();
    const topHouseMap = new Map<
      string,
      { houseId: string; totalEvents: number; sessionIds: Set<string> }
    >();

    let totalVisits = 0;
    let passwordSuccess = 0;
    let passwordFail = 0;
    let sectionViews = 0;
    let documentOpens = 0;
    let contactRequests = 0;

    for (const row of rows) {
      if (row.session_id) {
        sessionIds.add(row.session_id);
      }

      if (!safeFilter.houseId) {
        const item =
          topHouseMap.get(row.house_id) ??
          {
            houseId: row.house_id,
            totalEvents: 0,
            sessionIds: new Set<string>(),
          };

        item.totalEvents += 1;
        if (row.session_id) {
          item.sessionIds.add(row.session_id);
        }
        topHouseMap.set(row.house_id, item);
      }

      const dateKey = getDateKey(row.occurred_at);
      const daily = dateKey ? getDailyBucket(dailyMap, dateKey) : null;

      if (daily) {
        daily.totalEvents += 1;
      }

      if (row.event_type === "site_visit") {
        totalVisits += 1;
        if (daily) daily.visits += 1;
      }

      if (row.event_type === "password_success") {
        passwordSuccess += 1;
        if (daily) daily.passwordSuccess += 1;
      }

      if (row.event_type === "password_fail") {
        passwordFail += 1;
        if (daily) daily.passwordFail += 1;
      }

      if (row.event_type === "section_view") {
        sectionViews += 1;
        if (daily) daily.sectionViews += 1;
      }

      if (row.event_type === "document_open") {
        documentOpens += 1;
      }

      if (row.event_type === "contact_request_submitted") {
        contactRequests += 1;
        if (daily) daily.contactRequests += 1;
      }
    }

    let topHouses: AnalyticsTopHouse[] = [];

    if (!safeFilter.houseId && topHouseMap.size > 0) {
      const houseIds = Array.from(topHouseMap.keys());

      const { data: housesData, error: housesError } = await supabase
        .from("houses")
        .select("id, name, slug")
        .in("id", houseIds);

      if (housesError) {
        console.error("getAnalyticsOverview houses error:", housesError.message);
      }

      const houses = new Map(
        ((housesData ?? []) as HouseRow[]).map((house) => [house.id, house]),
      );

      topHouses = Array.from(topHouseMap.values())
        .map((item) => {
          const house = houses.get(item.houseId);

          return {
            houseId: item.houseId,
            houseName: house?.name?.trim() || house?.slug || "Будинок",
            houseSlug: house?.slug || "",
            totalEvents: item.totalEvents,
            uniqueSessions: item.sessionIds.size,
          };
        })
        .sort((left, right) => right.totalEvents - left.totalEvents)
        .slice(0, 10);
    }

    const attempts = passwordSuccess + passwordFail;

    return {
      kpi: {
        uniqueSessions: sessionIds.size,
        totalVisits,
        passwordSuccess,
        passwordFail,
        passwordSuccessRate:
          attempts > 0 ? Math.round((passwordSuccess / attempts) * 100) : 0,
        sectionViews,
        documentOpens,
        contactRequests,
      },
      daily: Array.from(dailyMap.values()).sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
      topHouses,
    };
  } catch (error) {
    console.error("getAnalyticsOverview crash:", error);
    return EMPTY_OVERVIEW;
  }
}
