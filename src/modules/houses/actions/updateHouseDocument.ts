"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type UpdateHouseDocumentResult = {
  error: string | null;
};

const DOCUMENT_BUCKET = "house-documents";

function normalizeCategory(value: string) {
  const allowed = new Set([
    "regulations",
    "tariffs",
    "meetings",
    "technical",
    "contracts",
    "resident_info",
  ]);

  return allowed.has(value) ? value : "regulations";
}

function normalizeVisibility(value: string) {
  const allowed = new Set(["draft", "private", "published"]);

  return allowed.has(value) ? value : "draft";
}

function sanitizeFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return normalized || "document-file";
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function updateHouseDocument(
  formData: FormData,
): Promise<UpdateHouseDocumentResult> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const category = normalizeCategory(
    String(formData.get("category") ?? "regulations").trim(),
  );
  const visibilityStatus = normalizeVisibility(
    String(formData.get("visibilityStatus") ?? "draft").trim(),
  );
  const description = String(formData.get("description") ?? "").trim();
  const removeAttachment =
    String(formData.get("removeAttachment") ?? "") === "true";

  if (!documentId) {
    return { error: "Не передан идентификатор документа." };
  }

  if (!houseId) {
    return { error: "Не передан идентификатор дома." };
  }

  if (!title) {
    return { error: "Заполни название документа." };
  }

  const fileEntry = formData.get("attachment");
  const nextFile =
    isFileLike(fileEntry) && fileEntry.size > 0 ? fileEntry : null;

  const supabase = await createSupabaseServerClient();

  const { data: existingDocument, error: existingDocumentError } = await supabase
    .from("house_documents")
    .select(
      "id, title, category, visibility_status, storage_bucket, storage_path, original_file_name, attachment_status",
    )
    .eq("id", documentId)
    .eq("house_id", houseId)
    .maybeSingle();

  if (existingDocumentError || !existingDocument) {
    return {
      error:
        existingDocumentError?.message ?? "Не удалось получить текущий документ.",
    };
  }

  const nowIso = new Date().toISOString();

  let storageBucket =
    typeof existingDocument.storage_bucket === "string"
      ? existingDocument.storage_bucket
      : null;
  let storagePath =
    typeof existingDocument.storage_path === "string"
      ? existingDocument.storage_path
      : null;
  let originalFileName =
    typeof existingDocument.original_file_name === "string"
      ? existingDocument.original_file_name
      : null;
  let mimeType: string | null = null;
  let fileSizeBytes: number | null = null;
  let uploadedAt: string | null = null;
  let attachmentStatus: "none" | "uploaded" =
    existingDocument.attachment_status === "uploaded" ? "uploaded" : "none";

  const shouldRemoveExistingFile =
    removeAttachment ||
    Boolean(nextFile && storageBucket && storagePath);

  if (shouldRemoveExistingFile && storageBucket && storagePath) {
    const { error: removeError } = await supabase.storage
      .from(storageBucket)
      .remove([storagePath]);

    if (removeError) {
      return {
        error: `Не удалось удалить старый файл документа: ${removeError.message}`,
      };
    }

    storageBucket = null;
    storagePath = null;
    originalFileName = null;
    mimeType = null;
    fileSizeBytes = null;
    uploadedAt = null;
    attachmentStatus = "none";
  }

  if (nextFile) {
    const safeFileName = sanitizeFileName(nextFile.name);
    const nextStoragePath = `${houseId}/${documentId}/${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(nextStoragePath, nextFile, {
        upsert: true,
        contentType: nextFile.type || undefined,
      });

    if (uploadError) {
      return {
        error: `Не удалось загрузить файл документа: ${uploadError.message}`,
      };
    }

    storageBucket = DOCUMENT_BUCKET;
    storagePath = nextStoragePath;
    originalFileName = nextFile.name;
    mimeType = nextFile.type || null;
    fileSizeBytes = nextFile.size;
    uploadedAt = nowIso;
    attachmentStatus = "uploaded";
  } else if (
    !removeAttachment &&
    existingDocument.attachment_status === "uploaded"
  ) {
    mimeType = null;
    fileSizeBytes = null;
    uploadedAt = null;
  }

  const { error: updateError } = await supabase
    .from("house_documents")
    .update({
      title,
      category,
      visibility_status: visibilityStatus,
      description: description || null,
      updated_at: nowIso,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      original_file_name: originalFileName,
      mime_type: nextFile ? mimeType : removeAttachment ? null : undefined,
      file_size_bytes: nextFile ? fileSizeBytes : removeAttachment ? null : undefined,
      uploaded_at: nextFile ? uploadedAt : removeAttachment ? null : undefined,
      attachment_status: attachmentStatus,
    })
    .eq("id", documentId)
    .eq("house_id", houseId);

  if (updateError) {
    return { error: `Не удалось обновить документ: ${updateError.message}` };
  }

  const currentAdmin = await getCurrentAdminUser();
  const actorName = getActorDisplayName({
    fullName: currentAdmin?.fullName ?? null,
    email: currentAdmin?.email ?? null,
  });

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName,
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "house_document",
    entityId: documentId,
    entityLabel: title,
    actionType: "update_house_document",
    description: `Обновлен документ «${title}».`,
    houseId,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "documents",
      entityType: "house_document",
      entityId: documentId,
      entityTitle: title,
      houseId,
      previousTitle: existingDocument.title ?? null,
      previousCategory: existingDocument.category ?? null,
      previousVisibilityStatus: existingDocument.visibility_status ?? null,
      documentCategory: category,
      visibilityStatus,
      attachmentStatus,
      attachmentChanged:
        Boolean(nextFile) || removeAttachment,
    },
  });

  revalidatePath(`/admin/houses/${houseId}`);

  return { error: null };
}
