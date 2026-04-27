"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { completeDocumentDraftApprovalTask } from "@/src/modules/tasks/services/completeDocumentDraftApprovalTask";

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

function normalizeDocumentScope(value: string) {
  return value === "founding" ? "founding" : "information";
}

function normalizeDocumentType(value: string) {
  const allowed = new Set([
    "statute",
    "extract",
    "protocol",
    "registration",
    "contracts",
    "other",
  ]);

  return allowed.has(value) ? value : "other";
}

function normalizeDocumentYear(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed >= 2016 && parsed <= 2026 ? parsed : null;
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Адміністратор";
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
  const documentScope = normalizeDocumentScope(
    String(formData.get("documentScope") ?? "information").trim(),
  );
  const documentType =
    documentScope === "founding"
      ? normalizeDocumentType(String(formData.get("documentType") ?? "other").trim())
      : null;
  const documentYear =
    documentScope === "information"
      ? normalizeDocumentYear(String(formData.get("documentYear") ?? "").trim())
      : null;

  const uploadedPdfPath = String(formData.get("uploadedPdfPath") ?? "").trim();
  const uploadedPdfName = String(formData.get("uploadedPdfName") ?? "").trim();
  const removeAttachment =
    String(formData.get("removeAttachment") ?? "") === "true";

  if (!documentId) return { error: "Не передано ідентифікатор документа." };
  if (!houseId) return { error: "Не передано ідентифікатор будинку." };
  if (!title) return { error: "Заповни назву документа." };

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: existingDocument } = await supabase
    .from("house_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!existingDocument) {
    return { error: "Документ не знайдено." };
  }

  let storageBucket = existingDocument.storage_bucket;
  let storagePath = existingDocument.storage_path;
  let originalFileName = existingDocument.original_file_name;
  let mimeType = existingDocument.mime_type;
  let uploadedAt = existingDocument.uploaded_at;
  let attachmentStatus = existingDocument.attachment_status;

  if (uploadedPdfPath) {
    storageBucket = DOCUMENT_BUCKET;
    storagePath = uploadedPdfPath;
    originalFileName = uploadedPdfName;
    mimeType = "application/pdf";
    uploadedAt = nowIso;
    attachmentStatus = "uploaded";
  }

  if (removeAttachment) {
    storageBucket = null;
    storagePath = null;
    originalFileName = null;
    mimeType = null;
    uploadedAt = null;
    attachmentStatus = "none";
  }

  const { error: updateError } = await supabase
    .from("house_documents")
    .update({
      title,
      category,
      visibility_status: visibilityStatus,
      description: description || null,
      document_year: documentYear,
      document_scope: documentScope,
      document_type: documentType,
      updated_at: nowIso,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      original_file_name: originalFileName,
      mime_type: mimeType,
      uploaded_at: uploadedAt,
      attachment_status: attachmentStatus,
    })
    .eq("id", documentId)
    .eq("house_id", houseId);

  if (updateError) {
    return { error: `Не вдалося оновити документ. ${updateError.message}` };
  }


  const currentAdmin = await getCurrentAdminUser();

  if (
    existingDocument.visibility_status === "draft" &&
    visibilityStatus === "published"
  ) {
    await completeDocumentDraftApprovalTask(
      documentId,
      currentAdmin?.id ?? null,
    );
  }

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName: getActorDisplayName({
      fullName: currentAdmin?.fullName ?? null,
      email: currentAdmin?.email ?? null,
    }),
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "house_document",
    entityId: documentId,
    entityLabel: title,
    actionType: "update_house_document",
    description: `Оновлено документ «${title}».`,
    houseId,
  });

  const { data: house } = await supabase
    .from("houses")
    .select("slug")
    .eq("id", houseId)
    .maybeSingle();

  revalidatePath(`/admin/houses/${houseId}`);
  if (house?.slug) {
    revalidatePath(`/house/${house.slug}/information`);
    revalidatePath(`/house/${house.slug}/founding-documents`);
  }

  return { error: null };
}
