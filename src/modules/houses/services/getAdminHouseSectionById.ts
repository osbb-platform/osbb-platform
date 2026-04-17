import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHouseSectionDetail = {
  id: string;
  house_page_id: string;
  kind: string;
  title: string | null;
  sort_order: number;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};

export async function getAdminHouseSectionById(
  sectionId: string,
): Promise<AdminHouseSectionDetail | null> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_sections")
    .select("id, house_page_id, kind, title, sort_order, status, content")
    .eq("id", sectionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load house section detail: ${error.message}`);
  }

  return (data ?? null) as AdminHouseSectionDetail | null;
}
