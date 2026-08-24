"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import {
  ADMIN_ACTIVE_CITY_COOKIE,
} from "@/src/modules/auth/services/getAdminCityContext";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

function normalizeReturnTo(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (raw === "/admin/profile") {
    return "/admin/profile";
  }

  return "/admin";
}

export async function setAdminActiveCity(formData: FormData) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || currentUser.role !== ROLES.SUPERADMIN) {
    throw new Error("FORBIDDEN");
  }

  const cityId = String(formData.get("cityId") ?? "").trim();

  if (!cityId) {
    throw new Error("CITY_REQUIRED");
  }

  const supabase = await createSupabaseServerClient();

  const { data: city, error } = await supabase
    .from("cities")
    .select("id")
    .eq("id", cityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !city) {
    throw new Error("CITY_NOT_AVAILABLE");
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_ACTIVE_CITY_COOKIE, cityId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(normalizeReturnTo(formData.get("returnTo")));
}
