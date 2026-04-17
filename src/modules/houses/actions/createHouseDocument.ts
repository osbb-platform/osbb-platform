"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type CreateHouseDocumentResult = {
  error: string | null;
};

const DOCUMENT_BUCKET = "house-documents";

function sanitizeFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return normalized || "document-file.pdf";
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

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



function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function createHouseDocument(
  formData: FormData,
): Promise<CreateHouseDocumentResult> {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const category = normalizeCategory(
    String(formData.get("category") ?? "regulations").trim(),
  );
  const visibilityStatus = "draft";
  const description = String(formData.get("description") ?? "").trim();
  const fileEntry = formData.get("attachment");
  const attachment = isFileLike(fileEntry) && fileEntry.size > 0 ? fileEntry : null;

  if (!houseId) {
    return { error: "Не передан идентификатор дома." };
  }

  if (!title) {
    return { error: "Заполни название документа." };
  }

  if (!attachment) {
    return { error: "Загрузи PDF файл документа." };
  }

  if (attachment.type && attachment.type !== "application/pdf") {
    return { error: "Допускается только PDF файл." };
  }

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: createdDocument, error } = await supabase
    .from("house_documents")
    .insert({
      house_id: houseId,
      title,
      category,
      visibility_status: visibilityStatus,
      description: description || null,
      created_at: nowIso,
      updated_at: nowIso,
      attachment_status: "none",
    })
    .select("id, title, category, visibility_status")
    .single();

  if (error || !createdDocument) {
    return {
      error: `Не удалось создать документ: ${error?.message ?? "Unknown error"}`,
    };
  }

  const safeFileName = sanitizeFileName(attachment.name);
  const storagePath = `${houseId}/${createdDocument.id}/${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, attachment, {
      upsert: true,
      contentType: attachment.type || undefined,
    });

  if (uploadError) {
    await supabase
      .from("house_documents")
      .delete()
      .eq("id", createdDocument.id)
      .eq("house_id", houseId);

    return {
      error: `Не удалось загрузить PDF документа: ${uploadError.message}`,
    };
  }

  const { error: attachUpdateError } = await supabase
    .from("house_documents")
    .update({
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: storagePath,
      original_file_name: attachment.name,
      mime_type: attachment.type || "application/pdf",
      file_size_bytes: attachment.size,
      uploaded_at: nowIso,
      attachment_status: "uploaded",
      updated_at: nowIso,
    })
    .eq("id", createdDocument.id)
    .eq("house_id", houseId);

  if (attachUpdateError) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    await supabase
      .from("house_documents")
      .delete()
      .eq("id", createdDocument.id)
      .eq("house_id", houseId);

    return {
      error: `Не удалось сохранить PDF документа: ${attachUpdateError.message}`,
    };
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
    entityId: createdDocument.id,
    entityLabel: createdDocument.title,
    actionType: "create_house_document",
    description: `Создан документ «${createdDocument.title}».`,
    houseId,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "documents",
      entityType: "house_document",
      entityId: createdDocument.id,
      entityTitle: createdDocument.title,
      houseId,
      documentCategory: createdDocument.category,
      visibilityStatus: createdDocument.visibility_status,
    },
  });

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/admin/houses/${houseId}?block=information`);

  return { error: null };
}
