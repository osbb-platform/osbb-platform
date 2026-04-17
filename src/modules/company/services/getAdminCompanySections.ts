import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminCompanySectionListItem = {
  id: string;
  company_page_id: string;
  kind: string;
  title: string | null;
  sort_order: number;
  status: "draft" | "in_review" | "published" | "archived";
};

export async function getAdminCompanySections(
  companyPageId: string,
): Promise<AdminCompanySectionListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_sections")
    .select("id, company_page_id, kind, title, sort_order, status")
    .eq("company_page_id", companyPageId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load company sections: ${error.message}`);
  }

  return (data ?? []) as AdminCompanySectionListItem[];
}
