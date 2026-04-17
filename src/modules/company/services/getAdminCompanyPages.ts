import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminCompanyPageListItem = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  is_primary: boolean;
  nav_order: number;
  show_in_navigation: boolean;
};

export async function getAdminCompanyPages(): Promise<AdminCompanyPageListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_pages")
    .select(
      "id, slug, title, status, seo_title, seo_description, is_primary, nav_order, show_in_navigation",
    )
    .order("nav_order", { ascending: true })
    .order("is_primary", { ascending: false });

  if (error) {
    throw new Error(`Failed to load admin company pages: ${error.message}`);
  }

  return (data ?? []) as AdminCompanyPageListItem[];
}
