import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function ensureHouseHomeDashboardSection(housePageId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "custom")
    .eq("title", "Home widgets")
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: housePageId,
      kind: "custom",
      title: "Home widgets",
      sort_order: 5,
      status: "published",
      content: {
        statusWidgets: [],
      },
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
