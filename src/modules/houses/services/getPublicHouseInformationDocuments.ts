import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublicHouseInformationDocumentItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  storage_path: string | null;
  original_file_name: string | null;
};

export async function getPublicHouseInformationDocuments(
  houseId: string,
): Promise<PublicHouseInformationDocumentItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_documents")
    .select(
      [
        "id",
        "title",
        "category",
        "description",
        "created_at",
        "updated_at",
        "storage_path",
        "original_file_name",
      ].join(", "),
    )
    .eq("house_id", houseId)
    .eq("visibility_status", "published")
    .eq("attachment_status", "uploaded")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load public house information documents: ${error.message}`,
    );
  }

  return (data ?? []) as unknown as PublicHouseInformationDocumentItem[];
}
