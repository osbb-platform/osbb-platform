import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { HouseDocumentType } from "@/src/modules/houses/services/getHouseDocuments";

export type PublicHouseFoundingDocumentItem = {
  id: string;
  title: string;
  description: string | null;
  document_type: HouseDocumentType | null;
  created_at: string;
  updated_at: string;
  storage_path: string | null;
  original_file_name: string | null;
};

export async function getPublicHouseFoundingDocuments(
  houseId: string,
): Promise<PublicHouseFoundingDocumentItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_documents")
    .select(
      [
        "id",
        "title",
        "description",
        "document_type",
        "created_at",
        "updated_at",
        "storage_path",
        "original_file_name",
      ].join(", "),
    )
    .eq("house_id", houseId)
    .eq("document_scope", "founding")
    .eq("visibility_status", "published")
    .eq("attachment_status", "uploaded")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load public house founding documents: ${error.message}`,
    );
  }

  return (data ?? []) as unknown as PublicHouseFoundingDocumentItem[];
}
