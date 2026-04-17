import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

const DEFAULT_REPORT_CATEGORIES = [
  "Выполненные работы",
  "Финансовый отчет",
  "Ремонт и обслуживание",
  "Инженерные системы",
] as const;

export async function ensureHouseReportsSection(params: {
  housePageId: string;
}) {
  const { housePageId } = params;
  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "reports")
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check reports section: ${existingError.message}`,
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
      kind: "reports",
      title: "Отчеты",
      sort_order: 130,
      status: "published",
      content: {
        reports: [],
        categoriesCatalog: [...DEFAULT_REPORT_CATEGORIES],
        updatedAt: now,
      },
    })
    .select("id")
    .single();

  if (createError || !createdSection?.id) {
    throw new Error(
      `Failed to create reports section: ${createError?.message ?? "Unknown error"}`,
    );
  }

  return createdSection.id;
}
