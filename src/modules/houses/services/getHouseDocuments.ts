import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseDocumentCategory =
  | "regulations"
  | "tariffs"
  | "meetings"
  | "technical"
  | "contracts"
  | "resident_info";

export type HouseDocumentLifecycle = "draft" | "published" | "archived";

/**
 * Temporary compatibility for HouseDocumentsWorkspace until Step D.
 * In the new model:
 * - archived is canonical
 * - private is the legacy UI label for archive
 */
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

type HouseDocumentFileRow = {
  entity_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
};

export type HouseDocumentListItem = {
  id: string;
  house_id: string;
  title: string;
  category: HouseDocumentCategory;
  lifecycle_status: HouseDocumentLifecycle;
  visibility_status: HouseDocumentVisibility;
  description: string | null;
  document_year: number | null;
  document_scope: HouseDocumentScope;
  document_type: HouseDocumentType | null;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  attachment_status: "none" | "uploaded";
  signed_file_url: string | null;
};

function lifecycleToVisibility(
  lifecycle: HouseDocumentLifecycle,
): HouseDocumentVisibility {
  return lifecycle === "archived" ? "private" : lifecycle;
}

async function createSignedUrl(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  bucket: string | null;
  path: string | null;
}) {
  if (!params.bucket || !params.path) {
    return null;
  }

  const { data, error } = await params.supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, 60 * 15);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function getHouseDocuments(
  houseId: string,
  options: { scope?: HouseDocumentScope } = {},
): Promise<HouseDocumentListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const createDocumentsQuery = () => {
    let query = supabase
      .from("house_documents")
      .select(
        [
          "id",
          "house_id",
          "title",
          "category",
          "lifecycle_status",
          "description",
          "document_year",
          "document_scope",
          "document_type",
          "lock_version",
          "created_at",
          "updated_at",
          "published_at",
          "archived_at",
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

    return query
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });
  };

  let documentsData: unknown[] = [];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await createDocumentsQuery();

    if (!error) {
      documentsData = data ?? [];
      lastError = null;
      break;
    }

    lastError = error;

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (lastError) {
    console.error("[admin.house.documents.load_failed]", {
      houseId,
      scope: options.scope ?? null,
      error: lastError,
    });

    return [];
  }

  const documentRows = documentsData as Array<
    Omit<
      HouseDocumentListItem,
      | "visibility_status"
      | "storage_bucket"
      | "storage_path"
      | "original_file_name"
      | "mime_type"
      | "file_size_bytes"
      | "uploaded_at"
      | "signed_file_url"
    > & {
      storage_bucket: string | null;
      storage_path: string | null;
      original_file_name: string | null;
      mime_type: string | null;
      file_size_bytes: number | null;
      uploaded_at: string | null;
    }
  >;

  const documentIds = documentRows.map((document) => document.id);

  let filesByDocumentId = new Map<string, HouseDocumentFileRow>();

  if (documentIds.length > 0) {
    const { data: files, error: filesError } = await supabase
      .from("house_content_files")
      .select(
        [
          "entity_id",
          "storage_bucket",
          "storage_path",
          "original_file_name",
          "mime_type",
          "size_bytes",
          "uploaded_at",
        ].join(", "),
      )
      .eq("entity_type", "house_document")
      .eq("field_key", "pdf")
      .in("entity_id", documentIds);

    if (filesError) {
      console.error("[admin.house.documents.files_load_failed]", {
        houseId,
        scope: options.scope ?? null,
        error: filesError,
      });
    } else {
      filesByDocumentId = new Map(
        ((files ?? []) as unknown as HouseDocumentFileRow[]).map((file) => [
          file.entity_id,
          file,
        ]),
      );
    }
  }

  const documentsWithSignedUrls = await Promise.all(
    documentRows.map(async (document) => {
      const trackedFile = filesByDocumentId.get(document.id);

      const storageBucket =
        trackedFile?.storage_bucket ?? document.storage_bucket ?? null;
      const storagePath =
        trackedFile?.storage_path ?? document.storage_path ?? null;
      const originalFileName =
        trackedFile?.original_file_name ?? document.original_file_name ?? null;
      const mimeType = trackedFile?.mime_type ?? document.mime_type ?? null;
      const fileSizeBytes =
        trackedFile?.size_bytes ?? document.file_size_bytes ?? null;
      const uploadedAt = trackedFile?.uploaded_at ?? document.uploaded_at ?? null;
      const attachmentStatus =
        storageBucket && storagePath ? "uploaded" : document.attachment_status;

      const signedFileUrl =
        attachmentStatus === "uploaded"
          ? await createSignedUrl({
              supabase,
              bucket: storageBucket,
              path: storagePath,
            })
          : null;

      return {
        ...document,
        visibility_status: lifecycleToVisibility(document.lifecycle_status),
        storage_bucket: storageBucket,
        storage_path: storagePath,
        original_file_name: originalFileName,
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
        uploaded_at: uploadedAt,
        attachment_status: attachmentStatus,
        signed_file_url: signedFileUrl,
      };
    }),
  );

  return documentsWithSignedUrls;
}
