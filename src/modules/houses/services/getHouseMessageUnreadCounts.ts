import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function getHouseMessageUnreadCounts() {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("specialist_contact_requests")
    .select("house_id")
    .eq("status", "new");

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return {} as Record<string, number>;
    }

    throw new Error(`Failed to load house message unread counts: ${error.message}`);
  }

  const counts: Record<string, number> = {};

  for (const row of data ?? []) {
    const houseId =
      row && typeof row === "object" && "house_id" in row
        ? String(row.house_id ?? "").trim()
        : "";

    if (!houseId) {
      continue;
    }

    counts[houseId] = (counts[houseId] ?? 0) + 1;
  }

  return counts;
}
