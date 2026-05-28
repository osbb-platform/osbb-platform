import { cache } from "react";
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

type DocumentRow = Omit<
  PublicHouseFoundingDocumentItem,
  "storage_path" | "original_file_name"
>;

type FileRow = {
  entity_id: string;
  storage_path: string | null;
  original_file_name: string | null;
};

export const getPublicHouseFoundingDocuments = cache(async (
  houseId: string,
): Promise<PublicHouseFoundingDocumentItem[]> => {
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
      ].join(", "),
    )
    .eq("house_id", houseId)
    .eq("document_scope", "founding")
    .eq("lifecycle_status", "published")
    .eq("attachment_status", "uploaded")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load public house founding documents: ${error.message}`,
    );
  }

  const documents = (data ?? []) as unknown as DocumentRow[];
  const documentIds = documents.map((document) => document.id);

  if (documentIds.length === 0) {
    return [];
  }

  const { data: files, error: filesError } = await supabase
    .from("house_content_files")
    .select("entity_id, storage_path, original_file_name")
    .eq("entity_type", "house_document")
    .eq("field_key", "pdf")
    .in("entity_id", documentIds);

  if (filesError) {
    throw new Error(
      `Failed to load public house founding document files: ${filesError.message}`,
    );
  }

  const filesByDocumentId = new Map(
    ((files ?? []) as FileRow[]).map((file) => [file.entity_id, file]),
  );

  return documents
    .map((document) => {
      const file = filesByDocumentId.get(document.id);

      return {
        ...document,
        storage_path: file?.storage_path ?? null,
        original_file_name: file?.original_file_name ?? null,
      };
    })
    .filter((document) => Boolean(document.storage_path));
});
