import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  logOptionalPublicReadError,
  throwRequiredPublicReadError,
} from "./publicContentResilience";
import type {
  HouseSpecialist,
  HouseSpecialistCategory,
} from "@/src/modules/content-engine/v2/handlers/specialists";
import {
  mapHouseSpecialist,
  mapHouseSpecialistCategory,
  type AdminHouseSpecialistsSnapshot,
} from "./getAdminHouseSpecialists";

async function loadPublishedHouseSpecialists(
  houseId: string,
): Promise<AdminHouseSpecialistsSnapshot> {
  const supabase = createSupabasePublicClient();

  const [specialistsResult, categoriesResult] = await Promise.all([
    supabase
      .from("house_specialists")
      .select("*")
      .eq("house_id", houseId)
      .eq("lifecycle_status", "published")
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("house_specialists_categories")
      .select("*")
      .eq("house_id", houseId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  if (specialistsResult.error) {
    throwRequiredPublicReadError({
      section: "specialists",
      resource: "house_specialists",
      houseId,
      error: specialistsResult.error,
    });
  }

  if (categoriesResult.error) {
    logOptionalPublicReadError({
      section: "specialists",
      resource: "house_specialists_categories",
      houseId,
      error: categoriesResult.error,
    });

    return {
      specialists: ((specialistsResult.data ?? []) as unknown as HouseSpecialist[]).map(
        mapHouseSpecialist,
      ),
      categories: [],
    };
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

export const getPublishedHouseSpecialists = cache(
  async (houseId: string): Promise<AdminHouseSpecialistsSnapshot> => {
    return unstable_cache(
      () => loadPublishedHouseSpecialists(houseId),
      ["published-house-specialists-v2", houseId],
      {
        tags: [`house:${houseId}:specialists`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
