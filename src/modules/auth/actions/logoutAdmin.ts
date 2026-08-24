"use server";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";
import { ADMIN_ACTIVE_CITY_COOKIE } from "@/src/modules/auth/services/getAdminCityContext";

export async function logoutAdmin() {
  const supabase = await createSupabaseActionClient();

  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ACTIVE_CITY_COOKIE);

  redirect(ROUTES.admin.login);
}
