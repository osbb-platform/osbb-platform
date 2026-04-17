"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import type { ApartmentsImportRow } from "@/src/modules/apartments/utils/parseApartmentsImportFile";

export type ReplaceHouseApartmentsByImportState = {
  error: string | null;
  success: string | null;
};

function normalizeArea(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = Number(trimmed.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

export async function replaceHouseApartmentsByImport(
  _prevState: ReplaceHouseApartmentsByImportState,
  formData: FormData,
): Promise<ReplaceHouseApartmentsByImportState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "apartments", action: "import" });
  if (accessError) return { error: accessError.error, success: null };

  const houseId = String(formData.get("houseId") ?? "").trim();
  const rawRows = String(formData.get("rows") ?? "[]");

  if (!houseId) {
    return {
      error: "Сначала выберите дом.",
      success: null,
    };
  }

  let rows: ApartmentsImportRow[] = [];

  try {
    rows = JSON.parse(rawRows);
  } catch {
    return {
      error: "Не удалось обработать импортируемые данные.",
      success: null,
    };
  }

  if (!rows.length) {
    return {
      error: "Файл не содержит строк для импорта.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { count: existingActiveCount, error: existingActiveCountError } = await supabase
    .from("house_apartments")
    .select("id", { count: "exact", head: true })
    .eq("house_id", houseId)
    .is("archived_at", null);

  if (existingActiveCountError) {
    return {
      error: `Не удалось получить текущий активный список: ${existingActiveCountError.message}`,
      success: null,
    };
  }

  const { error: deleteError } = await supabase
    .from("house_apartments")
    .delete()
    .eq("house_id", houseId)
    .is("archived_at", null);

  if (deleteError) {
    return {
      error: `Не удалось удалить текущий активный список: ${deleteError.message}`,
      success: null,
    };
  }

  const { error: insertError } = await supabase
    .from("house_apartments")
    .insert(
      rows.map((row) => ({
        house_id: houseId,
        account_number: row.accountNumber,
        apartment_label: row.apartmentLabel,
        owner_name: row.ownerName,
        area: normalizeArea(row.area),
        source_type: "import",
        created_by: currentUser?.id ?? null,
      })),
    );

  if (insertError) {
    return {
      error: `Ошибка импорта: ${insertError.message}`,
      success: null,
    };
  }

  if (currentUser) {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      entityType: "apartment_registry",
      entityId: houseId,
      entityLabel: houseId,
      actionType: "replace_apartments_by_import",
      description: `Импортом полностью заменен реестр квартир (${rows.length} строк).`,
      metadata: {
        sourceType: "cms",
        sourceModule: "apartments",
        houseId,
        deletedActiveCount: existingActiveCount ?? 0,
        importedCount: rows.length,
      },
    });
  }

  revalidatePath("/admin/apartments");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: `Импортировано ${rows.length} квартир.`,
  };
}
