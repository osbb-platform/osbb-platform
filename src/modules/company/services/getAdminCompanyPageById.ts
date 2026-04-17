import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminCompanyPageDetail = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  is_primary: boolean;
  nav_order: number;
  show_in_navigation: boolean;
  show_in_footer: boolean;
};

export async function getAdminCompanyPageById(
  pageId: string,
): Promise<AdminCompanyPageDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_pages")
    .select(
      "id, slug, title, status, seo_title, seo_description, published_at, is_primary, nav_order, show_in_navigation, show_in_footer",
    )
    .eq("id", pageId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load company page detail: ${error.message}`);
  }

  return (data ?? null) as AdminCompanyPageDetail | null;
}
