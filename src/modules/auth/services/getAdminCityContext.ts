import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export const ADMIN_ACTIVE_CITY_COOKIE = "admin-active-city";

export type AdminCityContext = {
  cityId: string;
  cityName: string;
  citySlug: string;
  source: "membership" | "superadmin-cookie";
};

type CityRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

async function loadActiveCity(cityId: string): Promise<CityRow | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cities")
    .select("id, name, slug, is_active")
    .eq("id", cityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getAdminCityContext city lookup error:", error.message);
    return null;
  }

  return (data ?? null) as CityRow | null;
}

export const getAdminCityContext = cache(
  async (): Promise<AdminCityContext | null> => {
    const currentUser = await getCurrentAdminUser();

    if (!currentUser?.role) {
      return null;
    }

    if (currentUser.role === ROLES.SUPERADMIN) {
      const cookieStore = await cookies();
      const selectedCityId =
        cookieStore.get(ADMIN_ACTIVE_CITY_COOKIE)?.value?.trim() ?? "";

      if (!selectedCityId) {
        return null;
      }

      const city = await loadActiveCity(selectedCityId);
      if (!city) {
        return null;
      }

      return {
        cityId: city.id,
        cityName: city.name,
        citySlug: city.slug,
        source: "superadmin-cookie",
      };
    }

    const membershipCityId = currentUser.membershipCityId?.trim() ?? "";

    if (!membershipCityId) {
      return null;
    }

    const city = await loadActiveCity(membershipCityId);
    if (!city) {
      return null;
    }

    return {
      cityId: city.id,
      cityName: city.name,
      citySlug: city.slug,
      source: "membership",
    };
  },
);
