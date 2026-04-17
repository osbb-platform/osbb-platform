import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHouseAccessStatus = {
  house_id: string;
  session_version: number;
  updated_at: string;
} | null;

export async function getAdminHouseAccessStatus(
  houseId: string,
): Promise<AdminHouseAccessStatus> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_access")
    .select("house_id, session_version, updated_at")
    .eq("house_id", houseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load house access status: ${error.message}`);
  }

  return (data ?? null) as AdminHouseAccessStatus;
}
