import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityScope } from "@/src/modules/auth/services/getAdminCityScope";
import { getSafeAnalyticsFilter } from "@/src/modules/analytics/services/date";
import {
  EMPTY_REQUESTS,
  type AnalyticsFilter,
  type AnalyticsRequests,
} from "@/src/modules/analytics/services/types";

type RequestRow = {
  id: string;
  created_at: string;
  house_id: string;
  house_slug: string | null;
  specialist_label: string | null;
  requester_name: string | null;
  apartment: string | null;
  status: string | null;
  subject: string | null;
};

export async function getAnalyticsRequests(
  filter: AnalyticsFilter,
): Promise<AnalyticsRequests> {
  noStore();

  try {
    const safeFilter = getSafeAnalyticsFilter(filter);
    const [supabase, cityScope] = await Promise.all([
      createSupabaseServerClient(),
      getAdminCityScope(),
    ]);

    if (!cityScope || cityScope.houseIds.length === 0) {
      return EMPTY_REQUESTS;
    }

    let countQuery = supabase
      .from("house_visitor_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "contact_request_submitted")
      .gte("occurred_at", safeFilter.from)
      .lte("occurred_at", safeFilter.to);

    let requestsQuery = supabase
      .from("specialist_contact_requests")
      .select(
        [
          "id",
          "created_at",
          "house_id",
          "house_slug",
          "specialist_label",
          "requester_name",
          "apartment",
          "status",
          "subject",
        ].join(", "),
      )
      .gte("created_at", safeFilter.from)
      .lte("created_at", safeFilter.to)
      .order("created_at", { ascending: false })
      .limit(10);

    if (safeFilter.houseId) {
      if (!cityScope.houseIds.includes(safeFilter.houseId)) return EMPTY_REQUESTS;
      countQuery = countQuery.eq("house_id", safeFilter.houseId);
      requestsQuery = requestsQuery.eq("house_id", safeFilter.houseId);
    } else {
      countQuery = countQuery.in("house_id", cityScope.houseIds);
      requestsQuery = requestsQuery.in("house_id", cityScope.houseIds);
    }

    const [{ count, error: countError }, { data, error: requestsError }] =
      await Promise.all([countQuery, requestsQuery]);

    if (countError) {
      console.error("getAnalyticsRequests count error:", countError.message);
    }

    if (requestsError) {
      console.error("getAnalyticsRequests latest error:", requestsError.message);
      return {
        total: count ?? 0,
        latest: [],
      };
    }

    return {
      total: count ?? 0,
      latest: ((data ?? []) as unknown as RequestRow[]).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        houseId: row.house_id,
        houseSlug: row.house_slug ?? "",
        specialistLabel: row.specialist_label ?? "",
        requesterName: row.requester_name ?? "",
        apartment: row.apartment ?? "",
        status: row.status ?? "",
        subject: row.subject ?? "",
      })),
    };
  } catch (error) {
    console.error("getAnalyticsRequests crash:", error);
    return EMPTY_REQUESTS;
  }
}
