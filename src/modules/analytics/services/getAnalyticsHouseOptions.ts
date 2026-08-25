import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityScope } from "@/src/modules/auth/services/getAdminCityScope";
import type { AnalyticsHouseOption } from "@/src/modules/analytics/services/types";

type HouseRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

export async function getAnalyticsHouseOptions(): Promise<AnalyticsHouseOption[]> {
  noStore();

  try {
    const [supabase, cityScope] = await Promise.all([
      createSupabaseServerClient(),
      getAdminCityScope(),
    ]);

    if (!cityScope || cityScope.houseIds.length === 0) return [];

    const { data, error } = await supabase
      .from("houses")
      .select("id, name, slug")
      .in("id", cityScope.houseIds)
      .is("archived_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("getAnalyticsHouseOptions error:", error.message);
      return [];
    }

    return ((data ?? []) as HouseRow[])
      .filter((house) => house.id && house.slug)
      .map((house) => ({
        id: house.id,
        name: house.name?.trim() || house.slug || "Будинок",
        slug: house.slug || "",
      }));
  } catch (error) {
    console.error("getAnalyticsHouseOptions crash:", error);
    return [];
  }
}
