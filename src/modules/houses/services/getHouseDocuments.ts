import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseDocumentCategory =
  | "regulations"
  | "tariffs"
  | "meetings"
  | "technical"
  | "contracts"
  | "resident_info";

export type HouseDocumentVisibility =
  | "draft"
  | "private"
  | "published";

export type HouseDocumentScope = "information" | "founding";

export type HouseDocumentType =
  | "statute"
  | "extract"
  | "protocol"
  | "registration"
  | "contracts"
  | "other";

export type HouseDocumentListItem = {
  id: string;
  house_id: string;
  title: string;
  category: HouseDocumentCategory;
  visibility_status: HouseDocumentVisibility;
  description: string | null;
  document_year: number | null;
  document_scope: HouseDocumentScope;
  document_type: HouseDocumentType | null;
  created_at: string;
  updated_at: string;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  attachment_status: "none" | "uploaded";
  signed_file_url: string | null;
};

export async function getHouseDocuments(
  houseId: string,
  options: { scope?: HouseDocumentScope } = {},
): Promise<HouseDocumentListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("house_documents")
    .select(
      [
        "id",
        "house_id",
        "title",
        "category",
        "visibility_status",
        "description",
        "document_year",
        "document_scope",
        "document_type",
        "created_at",
        "updated_at",
        "storage_bucket",
        "storage_path",
        "original_file_name",
        "mime_type",
        "file_size_bytes",
        "uploaded_at",
        "attachment_status",
      ].join(", "),
    )
    .eq("house_id", houseId);

  if (options.scope) {
    query = query.eq("document_scope", options.scope);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load house documents: ${error.message}`);
  }

  const documents = (data ?? []) as unknown as Omit<
    HouseDocumentListItem,
    "signed_file_url"
  >[];

  const documentsWithSignedUrls = await Promise.all(
    documents.map(async (document) => {
      if (
        document.attachment_status !== "uploaded" ||
        !document.storage_bucket ||
        !document.storage_path
      ) {
        return {
          ...document,
          signed_file_url: null,
        };
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(document.storage_bucket)
        .createSignedUrl(document.storage_path, 60 * 15);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return {
          ...document,
          signed_file_url: null,
        };
      }

      return {
        ...document,
        signed_file_url: signedUrlData.signedUrl,
      };
    }),
  );

  return documentsWithSignedUrls;
}
