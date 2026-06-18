"use server";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";

export async function logoutAdmin() {
  const supabase = await createSupabaseActionClient();

  await supabase.auth.signOut();

  redirect(ROUTES.admin.login);
}
