import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type ManagementCompanyOption = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

export async function getManagementCompanies(): Promise<ManagementCompanyOption[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("management_companies")
    .select(`
      id,
      slug,
      name,
      is_active
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load management companies: ${error.message}`,
    );
  }

  return (data ?? []) as ManagementCompanyOption[];
}
