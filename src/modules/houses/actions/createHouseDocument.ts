"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type CreateHouseDocumentResult = {
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

export async function createHouseDocument(
  formData: FormData,
): Promise<CreateHouseDocumentResult> {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const category = normalizeCategory(
    String(formData.get("category") ?? "regulations").trim(),
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

  if (!houseId) return { error: "Не передано ідентифікатор будинку." };
  if (!title) return { error: "Заповни назву документа." };
  if (!uploadedPdfPath) return { error: "PDF не завантажено." };

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("house_documents")
    .insert({
      house_id: houseId,
      title,
      category,
      visibility_status: "draft",
      description: description || null,
      document_year: documentYear,
      document_scope: documentScope,
      document_type: documentType,
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: uploadedPdfPath,
      original_file_name: uploadedPdfName,
      mime_type: "application/pdf",
      attachment_status: "uploaded",
      created_at: nowIso,
      updated_at: nowIso,
      uploaded_at: nowIso,
    })
    .select("id, title")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Помилка створення документа" };
  }

  const currentAdmin = await getCurrentAdminUser();

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName: getActorDisplayName({
      fullName: currentAdmin?.fullName ?? null,
      email: currentAdmin?.email ?? null,
    }),
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "house_document",
    entityId: data.id,
    entityLabel: data.title,
    actionType: "create_house_document",
    description: `Створено документ «${data.title}».`,
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
