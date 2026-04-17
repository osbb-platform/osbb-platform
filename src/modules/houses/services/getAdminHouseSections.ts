import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHouseSectionListItem = {
  id: string;
  house_page_id: string;
  kind: string;
  title: string | null;
  sort_order: number;
  status: "draft" | "in_review" | "published" | "archived";
  created_at: string;
  updated_at: string | null;
};

export async function getAdminHouseSections(
  housePageId: string,
): Promise<AdminHouseSectionListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_sections")
    .select(
      "id, house_page_id, kind, title, sort_order, status, created_at, updated_at",
    )
    .eq("house_page_id", housePageId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load house sections: ${error.message}`);
  }

  return (data ?? []) as AdminHouseSectionListItem[];
}
