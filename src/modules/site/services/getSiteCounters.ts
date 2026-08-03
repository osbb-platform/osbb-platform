import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export type SiteCounters = {
  housesLive: number;
  citiesLive: number;
  materialsLast30: number;
  sectionsCount: 12;
};

const SITE_COUNTERS_REVALIDATE_SECONDS = 600;
const SITE_SECTIONS_COUNT = 12 as const;

async function loadSiteCounters(): Promise<SiteCounters | null> {
  try {
    const supabase = createSupabaseAdminClient();

    const cutoff = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      housesResult,
      citiesResult,
      materialsResult,
    ] = await Promise.all([
      supabase
        .from("houses")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("is_active", true)
        .is("archived_at", null),

      supabase
        .from("site_cities")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "live"),

      supabase
        .from("house_content_history")
        .select("id", {
          count: "exact",
          head: true,
        })
        .gte("occurred_at", cutoff)
        .ilike("action", "%publish%"),
    ]);

    const error =
      housesResult.error ??
      citiesResult.error ??
      materialsResult.error;

    if (error) {
      console.error("Failed to load site counters:", {
        message: error.message,
      });

      return null;
    }

    return {
      housesLive: housesResult.count ?? 0,
      citiesLive: citiesResult.count ?? 0,
      materialsLast30: materialsResult.count ?? 0,
      sectionsCount: SITE_SECTIONS_COUNT,
    };
  } catch (error) {
    console.error("Failed to initialize site counters:", error);

    return null;
  }
}

export const getSiteCounters = cache(
  async (): Promise<SiteCounters | null> => {
    return unstable_cache(
      loadSiteCounters,
      ["site-counters-v1"],
      {
        tags: ["site:counters"],
        revalidate: SITE_COUNTERS_REVALIDATE_SECONDS,
      },
    )();
  },
);
