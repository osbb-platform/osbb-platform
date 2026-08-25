import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type AdminContractorOption = {
  id: string;
  name: string;
  cityId: string | null;
  isGlobal: boolean;
  canDeactivate: boolean;
};

type ContractorRow = {
  id: string;
  name: string;
  city_id: string | null;
};

export async function getAdminContractors(): Promise<AdminContractorOption[]> {
  noStore();

  const [supabase, cityContext, currentUser] = await Promise.all([
    createSupabaseServerClient(),
    getAdminCityContext(),
    getCurrentAdminUser(),
  ]);

  if (!cityContext || !currentUser) {
    return [];
  }

  const { data, error } = await supabase
    .from("contractors")
    .select("id, name, city_id")
    .eq("is_active", true)
    .or(`city_id.is.null,city_id.eq.${cityContext.cityId}`)
    .order("normalized_name", { ascending: true });

  if (error) {
    console.error("Failed to load active contractors:", error.message);
    return [];
  }

  return ((data ?? []) as ContractorRow[]).map((contractor) => {
    const isGlobal = contractor.city_id === null;

    return {
      id: contractor.id,
      name: contractor.name,
      cityId: contractor.city_id,
      isGlobal,
      canDeactivate:
        currentUser.role === ROLES.SUPERADMIN ||
        (!isGlobal && currentUser.role === ROLES.ADMIN),
    };
  });
}
