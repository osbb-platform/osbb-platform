import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminContractorOption = {
  id: string;
  name: string;
};

type ContractorRow = {
  id: string;
  name: string;
};

export async function getAdminContractors(): Promise<AdminContractorOption[]> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contractors")
    .select("id, name")
    .eq("is_active", true)
    .is("city_id", null)
    .order("normalized_name", { ascending: true });

  if (error) {
    console.error("Failed to load active contractors:", error.message);
    return [];
  }

  return ((data ?? []) as ContractorRow[]).map((contractor) => ({
    id: contractor.id,
    name: contractor.name,
  }));
}
