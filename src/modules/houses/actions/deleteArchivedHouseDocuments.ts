"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";

type DeleteArchivedHouseDocumentsResult = {
  error: string | null;
};

export async function deleteArchivedHouseDocuments(
  formData: FormData,
): Promise<DeleteArchivedHouseDocumentsResult> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "delete",
  });

  if (accessError) {
    return { error: accessError.error };
  }

  const houseId = String(formData.get("houseId") ?? "").trim();
  const documentScope = String(formData.get("documentScope") ?? "information").trim();
  const normalizedScope = documentScope === "founding" ? "founding" : "information";

  if (!houseId) {
    return { error: "Не передано ідентифікатор будинку." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: archivedDocuments, error: loadError } = await supabase
    .from("house_documents")
    .select("id, storage_bucket, storage_path")
    .eq("house_id", houseId)
    .eq("document_scope", normalizedScope)
    .eq("visibility_status", "private");

  if (loadError) {
    return { error: `Не вдалося отримати архівні документи: ${loadError.message}` };
  }

  if (!archivedDocuments || archivedDocuments.length === 0) {
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

  const storageGroups = new Map<string, string[]>();

  archivedDocuments.forEach((document) => {
    if (
      typeof document.storage_bucket === "string" &&
      document.storage_bucket &&
      typeof document.storage_path === "string" &&
      document.storage_path
    ) {
      const paths = storageGroups.get(document.storage_bucket) ?? [];
      paths.push(document.storage_path);
      storageGroups.set(document.storage_bucket, paths);
    }
  });

  for (const [bucket, paths] of storageGroups.entries()) {
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);

    if (removeError) {
      return { error: `Не вдалося видалити файли архіву: ${removeError.message}` };
    }
  }

  const archivedIds = archivedDocuments.map((document) => document.id);

  const { error: deleteError } = await supabase
    .from("house_documents")
    .delete()
    .eq("house_id", houseId)
    .eq("document_scope", normalizedScope)
    .eq("visibility_status", "private")
    .in("id", archivedIds);

  if (deleteError) {
    return { error: `Не вдалося видалити архівні документи: ${deleteError.message}` };
  }

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
