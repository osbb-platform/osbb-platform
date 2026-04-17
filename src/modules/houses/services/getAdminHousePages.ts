import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHousePageListItem = {
  id: string;
  house_id: string;
  slug: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  created_at: string;
  updated_at: string | null;
};

export async function getAdminHousePages(
  houseId: string,
): Promise<AdminHousePageListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select(
      "id, house_id, slug, title, status, created_at, updated_at",
    )
    .eq("house_id", houseId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load house pages: ${error.message}`);
  }

  return (data ?? []) as AdminHousePageListItem[];
}
