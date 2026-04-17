import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseSpecialistContactRequestRecord = {
  id: string;
  created_at: string;
  house_id: string;
  house_slug: string;
  category: string;
  specialist_id: string | null;
  specialist_label: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  apartment: string;
  subject: string | null;
  comment: string | null;
  status: string;
};

export async function getHouseSpecialistContactRequests(houseId: string) {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("specialist_contact_requests")
    .select(
      [
        "id",
        "created_at",
        "house_id",
        "house_slug",
        "category",
        "specialist_id",
        "specialist_label",
        "requester_name",
        "requester_email",
        "requester_phone",
        "apartment",
        "subject",
        "comment",
        "status",
      ].join(", "),
    )
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache") ||
      message.includes("column");

    if (isMissingTable) {
      return [] as HouseSpecialistContactRequestRecord[];
    }

    throw new Error(
      `Failed to load house specialist contact requests: ${error.message}`,
    );
  }

  return (data ?? []) as unknown as HouseSpecialistContactRequestRecord[];
}
