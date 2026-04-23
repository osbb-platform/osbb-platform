"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type CreateApartmentsMiniBulkState = {
  error: string | null;
  successMessage: string | null;
};

type MiniBulkRow = {
  accountNumber: string;
  apartmentLabel: string;
  ownerName: string;
  area: string;
};

function normalizeArea(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = Number(trimmed.replace(",", "."));

  return Number.isFinite(normalized) ? normalized : null;
}

export async function createApartmentsMiniBulk(
  _prevState: CreateApartmentsMiniBulkState,
  formData: FormData,
): Promise<CreateApartmentsMiniBulkState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "apartments", action: "bulk" });
  if (accessError) return { error: accessError.error, successMessage: null };

  const houseId = String(formData.get("houseId") ?? "").trim();
  const rawRows = String(formData.get("rows") ?? "[]");

  if (!houseId) {
    return {
      error: "Спочатку оберіть будинок.",
      successMessage: null,
    };
  }

  let rows: MiniBulkRow[] = [];

  try {
    rows = JSON.parse(rawRows);
  } catch {
    return {
      error: "Не вдалося обробити рядки для додавання.",
      successMessage: null,
    };
  }

  const preparedRows = rows
    .slice(0, 20)
    .map((row) => ({
      account_number: String(row.accountNumber ?? "").trim(),
      apartment_label: String(row.apartmentLabel ?? "").trim(),
      owner_name: String(row.ownerName ?? "").trim(),
      area: normalizeArea(String(row.area ?? "")),
    }))
    .filter(
      (row) =>
        row.account_number &&
        row.apartment_label &&
        row.owner_name,
    );

  if (preparedRows.length === 0) {
    return {
      error: "Додайте хоча б один валідний рядок.",
      successMessage: null,
    };
  }

  const duplicatePayloadKeys = new Set<string>();

  for (const row of preparedRows) {
    const key = `${row.account_number}::${row.apartment_label}`.toLowerCase();

    if (duplicatePayloadKeys.has(key)) {
      return {
        error: `Дублікат у формі: ${row.apartment_label}`,
        successMessage: null,
      };
    }

    duplicatePayloadKeys.add(key);
  }

  const supabase = await createSupabaseServerClient();

  const apartmentLabels = preparedRows.map((row) => row.apartment_label);
  const accountNumbers = preparedRows.map((row) => row.account_number);

  const { data: existingRows, error: existingError } = await supabase
    .from("house_apartments")
    .select("id, apartment_label, account_number")
    .eq("house_id", houseId)
    .is("archived_at", null)
    .or(
      `apartment_label.in.(${apartmentLabels.join(",")}),account_number.in.(${accountNumbers.join(",")})`,
    );

  if (existingError) {
    return {
      error: `Помилка перевірки дублікатів: ${existingError.message}`,
      successMessage: null,
    };
  }

  if ((existingRows ?? []).length > 0) {
    return {
      error: "Деякі квартири або особові рахунки вже існують в активному реєстрі.",
      successMessage: null,
    };
  }


  const { error: insertError } = await supabase
    .from("house_apartments")
    .insert(
      preparedRows.map((row) => ({
        ...row,
        house_id: houseId,
        source_type: "manual",
        created_by: currentUser?.id ?? null,
      })),
    );

  if (insertError) {
    return {
      error: `Помилка додавання квартир: ${insertError.message}`,
      successMessage: null,
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
      actionType: "mini_bulk_create_apartments",
      description: `Додано ${preparedRows.length} квартир вручну.`,
      metadata: {
        insertedCount: preparedRows.length,
        houseId,
      },
    });
  }

  revalidatePath("/admin/apartments");
  revalidatePath("/admin/history");

  return {
    error: null,
    successMessage: `Додано ${preparedRows.length} квартир.`,
  };
}
