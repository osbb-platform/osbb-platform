"use server";

import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import {
  ADMIN_ACTIVE_CITY_COOKIE,
} from "@/src/modules/auth/services/getAdminCityContext";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type SetAdminActiveCityState = {
  error: string | null;
  destination: "/admin" | "/admin/profile" | null;
};

function normalizeReturnTo(
  value: FormDataEntryValue | null,
): "/admin" | "/admin/profile" {
  const raw = String(value ?? "").trim();

  if (raw === "/admin/profile") {
    return "/admin/profile";
  }

  return "/admin";
}

export async function setAdminActiveCity(
  _previousState: SetAdminActiveCityState,
  formData: FormData,
): Promise<SetAdminActiveCityState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || currentUser.role !== ROLES.SUPERADMIN) {
    throw new Error("FORBIDDEN");
  }

  const cityId = String(formData.get("cityId") ?? "").trim();

  if (!cityId) {
    return {
      error: "Оберіть місто.",
      destination: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: city, error } = await supabase
    .from("cities")
    .select("id")
    .eq("id", cityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !city) {
    return {
      error: "Обране місто недоступне.",
      destination: null,
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_ACTIVE_CITY_COOKIE, cityId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    error: null,
    destination: normalizeReturnTo(formData.get("returnTo")),
  };
}
