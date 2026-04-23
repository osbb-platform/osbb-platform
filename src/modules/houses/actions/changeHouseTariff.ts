"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";

type State = {
  error: string | null;
  successMessage: string | null;
};

export async function changeHouseTariff(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const user = await getCurrentAdminUser();

  const accessError = assertRegistryActionAccess({
    role: user?.role,
    area: "houses",
    action: "security",
  });

  if (accessError) {
    return { error: accessError.error, successMessage: null };
  }

  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const rawTariff = String(formData.get("tariff") ?? "").trim();
  const tariff = rawTariff ? Number(rawTariff) : null;

  if (rawTariff && Number.isNaN(tariff)) {
    return { error: "Введіть коректне число", successMessage: null };
  }

  if (!houseId) {
    return { error: "Будинок не знайдено", successMessage: null };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("houses")
    .update({ tariff_amount: tariff })
    .eq("id", houseId);

  if (error) {
    return { error: error.message, successMessage: null };
  }

  revalidatePath("/admin/houses");
  revalidatePath(`/house/${houseSlug}`);

  return {
    error: null,
    successMessage: "Тариф збережено",
  };
}
