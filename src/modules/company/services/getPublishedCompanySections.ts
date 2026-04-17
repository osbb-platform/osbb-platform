import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublishedCompanySectionRecord = {
  id: string;
  company_page_id: string;
  kind: string;
  title: string | null;
  sort_order: number;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};

export async function getPublishedCompanySections(
  companyPageId: string,
): Promise<PublishedCompanySectionRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_sections")
    .select("id, company_page_id, kind, title, sort_order, status, content")
    .eq("company_page_id", companyPageId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load published company sections: ${error.message}`);
  }

  return (data ?? []) as PublishedCompanySectionRecord[];
}
