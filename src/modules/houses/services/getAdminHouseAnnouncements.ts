import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { Announcement } from "@/src/modules/content-engine/v2/handlers/announcements/types";

export async function getAdminHouseAnnouncements(params: {
  houseId: string;
}): Promise<Announcement[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_announcements")
    .select("*")
    .eq("house_id", params.houseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load admin announcements:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Announcement[];
}
