import "server-only";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";

type ResolveDistrictMutationCityResult =
  | { cityId: string; error: null }
  | { cityId: null; error: string };

export async function resolveDistrictMutationCity(params: {
  currentAdmin: CurrentAdminUser;
  requestedCityId?: string | null;
}): Promise<ResolveDistrictMutationCityResult> {
  const requestedCityId = params.requestedCityId?.trim() ?? "";
  const cityContext = await getAdminCityContext();

  if (!cityContext) {
    return {
      cityId: null,
      error: "Не вдалося визначити активне місто.",
    };
  }

  if (params.currentAdmin.role !== ROLES.SUPERADMIN) {
    if (requestedCityId && requestedCityId !== cityContext.cityId) {
      return {
        cityId: null,
        error: "Недостатньо прав для роботи з районом іншого міста.",
      };
    }

    return {
      cityId: cityContext.cityId,
      error: null,
    };
  }

  const cityId = requestedCityId || cityContext.cityId;
  const supabase = await createSupabaseServerClient();

  const { data: city, error } = await supabase
    .from("cities")
    .select("id")
    .eq("id", cityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !city) {
    return {
      cityId: null,
      error: "Обране місто недоступне.",
    };
  }

  return {
    cityId,
    error: null,
  };
}
