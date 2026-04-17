import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function ensureHouseMeetingsSection(params: {
  housePageId: string;
}) {
  const { housePageId } = params;
  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "meetings")
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check meetings section: ${existingError.message}`,
    );
  }

  if (existingSection?.id) {
    return existingSection.id;
  }

  const now = new Date().toISOString();

  const { data: createdSection, error: createError } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: housePageId,
      kind: "meetings",
      title: "Собрания",
      sort_order: 150,
      status: "published",
      content: {
        items: [],
        updatedAt: now,
      },
    })
    .select("id")
    .single();

  if (createError || !createdSection?.id) {
    throw new Error(
      `Failed to create meetings section: ${createError?.message ?? "Unknown error"}`,
    );
  }

  return createdSection.id;
}
