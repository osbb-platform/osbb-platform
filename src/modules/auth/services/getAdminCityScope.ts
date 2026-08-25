import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";

export type AdminCityScope = {
  cityId: string;
  districtIds: string[];
  houseIds: string[];
};

export const getAdminCityScope = cache(
  async (): Promise<AdminCityScope | null> => {
    const cityContext = await getAdminCityContext();

    if (!cityContext) {
      return null;
    }

    const supabase = await createSupabaseServerClient();

    const { data: districts, error: districtsError } = await supabase
      .from("districts")
      .select("id")
      .eq("city_id", cityContext.cityId);

    if (districtsError) {
      console.error("getAdminCityScope districts error:", districtsError.message);
      return null;
    }

    const districtIds = (districts ?? [])
      .map((district) => String(district.id ?? "").trim())
      .filter(Boolean);

    if (districtIds.length === 0) {
      return {
        cityId: cityContext.cityId,
        districtIds: [],
        houseIds: [],
      };
    }

    const { data: houses, error: housesError } = await supabase
      .from("houses")
      .select("id")
      .in("district_id", districtIds);

    if (housesError) {
      console.error("getAdminCityScope houses error:", housesError.message);
      return null;
    }

    return {
      cityId: cityContext.cityId,
      districtIds,
      houseIds: (houses ?? [])
        .map((house) => String(house.id ?? "").trim())
        .filter(Boolean),
    };
  },
);
