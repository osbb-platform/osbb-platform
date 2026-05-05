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
      error: "Спочатку оберіть будинок.",
      success: null,
    };
  }

  let rows: ApartmentsImportRow[] = [];

  try {
    rows = JSON.parse(rawRows);
  } catch {
    return {
      error: "Не вдалося обробити імпортовані дані.",
      success: null,
    };
  }

  if (!rows.length) {
    return {
      error: "Файл не містить рядків для імпорту.",
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
      error: `Не вдалося отримати поточний активний список: ${existingActiveCountError.message}`,
      success: null,
    };
  }

  const archivedAt = new Date().toISOString();

  const { error: archiveError } = await supabase
    .from("house_apartments")
    .update({ archived_at: archivedAt })
    .eq("house_id", houseId)
    .is("archived_at", null);

  if (archiveError) {
    return {
      error: `Не вдалося архівувати поточний активний список: ${archiveError.message}`,
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
      error: `Помилка імпорту: ${insertError.message}`,
      success: null,
    };
  }

  const { count: activeCountAfterImport, error: activeCountAfterImportError } = await supabase
    .from("house_apartments")
    .select("id", { count: "exact", head: true })
    .eq("house_id", houseId)
    .is("archived_at", null);

  if (activeCountAfterImportError) {
    return {
      error: `Імпорт завершено, але не вдалося перевірити активний список: ${activeCountAfterImportError.message}`,
      success: null,
    };
  }

  if ((activeCountAfterImport ?? 0) !== rows.length) {
    return {
      error: `Імпорт зупинено: після заміни активний список містить ${activeCountAfterImport ?? 0} квартир замість ${rows.length}. Перевірте реєстр перед повторним імпортом.`,
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
      description: `Імпортом повністю замінено реєстр квартир (${rows.length} строк).`,
      metadata: {
        sourceType: "cms",
        sourceModule: "apartments",
        houseId,
        archivedActiveCount: existingActiveCount ?? 0,
        importedCount: rows.length,
      },
    });
  }

  revalidatePath("/admin/apartments");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: `Імпортовано ${rows.length} квартир.`,
  };
}
