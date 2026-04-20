"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function markCompanyRequestsSeen() {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("company_contact_requests")
    .update({ status: "seen" })
    .eq("status", "new");

  if (error) {
    throw new Error(`Failed to mark company requests as seen: ${error.message}`);
  }

  revalidatePath("/admin/company-pages");
}
