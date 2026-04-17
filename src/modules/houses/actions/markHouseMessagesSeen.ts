"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function markHouseMessagesSeen(houseId: string) {
  const normalizedHouseId = String(houseId ?? "").trim();

  if (!normalizedHouseId) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("specialist_contact_requests")
    .update({ status: "seen" })
    .eq("house_id", normalizedHouseId)
    .eq("status", "new");

  if (error) {
    throw new Error(`Failed to mark house messages as seen: ${error.message}`);
  }

  revalidatePath("/admin/houses");
}
