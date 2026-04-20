import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function getCompanyUnreadRequestsCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("company_contact_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return 0;
    }

    throw new Error(`Failed to load company unread requests count: ${error.message}`);
  }

  return count ?? 0;
}
