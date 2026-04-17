import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

const DEFAULT_SPECIALIST_CATEGORIES = [
  "Сантехник",
  "Электрик",
  "Аварийная служба",
  "Уборка / обслуживание",
  "Управляющая компания",
] as const;

export async function ensureHouseSpecialistsSection(params: {
  housePageId: string;
  houseSlug: string;
}) {
  const { housePageId } = params;
  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "specialists")
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check specialists section: ${existingError.message}`,
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
      kind: "specialists",
      title: "Специалисты",
      sort_order: 110,
      status: "published",
      content: {
        specialists: [],
        categoriesCatalog: [...DEFAULT_SPECIALIST_CATEGORIES],
        updatedAt: now,
      },
    })
    .select("id")
    .single();

  if (createError || !createdSection?.id) {
    throw new Error(
      `Failed to create specialists section: ${createError?.message ?? "Unknown error"}`,
    );
  }

  return createdSection.id;
}
