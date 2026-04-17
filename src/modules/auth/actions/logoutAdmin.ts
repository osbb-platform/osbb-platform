"use server";

import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";

export async function logoutAdmin() {
  const supabase = await createSupabaseActionClient();

  await supabase.auth.signOut();

  redirect("/admin/login");
}
