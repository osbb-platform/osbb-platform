import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { AnalyticsHouseOption } from "@/src/modules/analytics/services/types";

type HouseRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

export async function getAnalyticsHouseOptions(): Promise<AnalyticsHouseOption[]> {
  noStore();

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("houses")
      .select("id, name, slug")
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
