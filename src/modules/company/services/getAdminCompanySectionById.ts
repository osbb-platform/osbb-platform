import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminCompanySectionDetail = {
  id: string;
  company_page_id: string;
  kind: string;
  title: string | null;
  sort_order: number;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};

export async function getAdminCompanySectionById(
  sectionId: string,
): Promise<AdminCompanySectionDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_sections")
    .select("id, company_page_id, kind, title, sort_order, status, content")
    .eq("id", sectionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load company section detail: ${error.message}`);
  }

  return (data ?? null) as AdminCompanySectionDetail | null;
}
