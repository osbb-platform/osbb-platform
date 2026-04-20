import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type CompanyContactRequestRecord = {
  id: string;
  created_at: string;
  type: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  house_name: string;
  osbb_name: string | null;
  address: string;
  comment: string | null;
  status: string;
};

export async function getCompanyContactRequests(): Promise<CompanyContactRequestRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_contact_requests")
    .select(
      [
        "id",
        "created_at",
        "type",
        "requester_name",
        "requester_email",
        "requester_phone",
        "house_name",
        "osbb_name",
        "address",
        "comment",
        "status",
      ].join(", "),
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return [];
    }

    throw new Error(`Failed to load company contact requests: ${error.message}`);
  }

  return (data ?? []) as unknown as CompanyContactRequestRecord[];
}
