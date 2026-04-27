"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type DeleteHouseDocumentResult = {
  error: string | null;
};

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Адміністратор";
}

export async function deleteHouseDocument(
  formData: FormData,
): Promise<DeleteHouseDocumentResult> {
  const currentAdmin = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentAdmin?.role,
    area: "houses",
    action: "delete",
  });

  if (accessError) {
    return { error: accessError.error };
  }

  const documentId = String(formData.get("documentId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();

  if (!documentId) {
    return { error: "Не передано ідентифікатор документа." };
  }

  if (!houseId) {
    return { error: "Не передано ідентифікатор будинку." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingDocument, error: existingDocumentError } = await supabase
    .from("house_documents")
    .select("id, title, category, visibility_status, storage_bucket, storage_path")
    .eq("id", documentId)
    .eq("house_id", houseId)
    .maybeSingle();

  if (existingDocumentError) {
    return {
      error: `Не вдалося отримати документ перед видаленням: ${existingDocumentError.message}`,
    };
  }

  if (!existingDocument) {
    return { error: "Документ не знайдено." };
  }

  if (
    typeof existingDocument.storage_bucket === "string" &&
    existingDocument.storage_bucket &&
    typeof existingDocument.storage_path === "string" &&
    existingDocument.storage_path
  ) {
    const { error: removeError } = await supabase.storage
      .from(existingDocument.storage_bucket)
      .remove([existingDocument.storage_path]);

    if (removeError) {
      return {
        error: `Не вдалося видалити файл документа: ${removeError.message}`,
      };
    }
  }

  const { error } = await supabase
    .from("house_documents")
    .delete()
    .eq("id", documentId)
    .eq("house_id", houseId);

  if (error) {
    return { error: `Не вдалося видалити документ: ${error.message}` };
  }


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
    entityId: existingDocument.id,
    entityLabel: existingDocument.title ?? "Документ",
    actionType: "delete_house_document",
    description: `Видалено документ «${existingDocument.title ?? "Без назви"}».`,
    houseId,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "documents",
      entityType: "house_document",
      entityId: existingDocument.id,
      entityTitle: existingDocument.title ?? null,
      houseId,
      documentCategory: existingDocument.category ?? null,
      visibilityStatus: existingDocument.visibility_status ?? null,
    },
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
