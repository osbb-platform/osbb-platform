"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type DeactivateAdminContractorResult = {
  error: string | null;
};

export async function deactivateAdminContractor(
  contractorId: string,
): Promise<DeactivateAdminContractorResult> {
  const [currentUser, cityContext] = await Promise.all([
    getCurrentAdminUser(),
    getAdminCityContext(),
  ]);

  if (
    !currentUser ||
    (currentUser.role !== ROLES.ADMIN &&
      currentUser.role !== ROLES.SUPERADMIN) ||
    !cityContext
  ) {
    return {
      error: "Недостатньо прав для деактивації підрядника.",
    };
  }

  const id = contractorId.trim();

  if (!id) {
    return {
      error: "Не передано підрядника.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: contractor, error: loadError } = await supabase
    .from("contractors")
    .select("id, name, city_id, is_active")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !contractor) {
    return {
      error:
        loadError?.message ??
        "Підрядника не знайдено або він недоступний у поточному scope.",
    };
  }

  if (contractor.city_id === null) {
    if (currentUser.role !== ROLES.SUPERADMIN) {
      return {
        error: "Глобальних підрядників може деактивувати тільки superadmin.",
      };
    }
  } else if (
    currentUser.role !== ROLES.SUPERADMIN &&
    contractor.city_id !== cityContext.cityId
  ) {
    return {
      error: "City-admin може деактивувати підрядників тільки свого міста.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("contractors")
    .update({
      is_active: false,
    })
    .eq("id", contractor.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return {
      error:
        updateError?.message ??
        "Не вдалося деактивувати підрядника.",
    };
  }

  revalidatePath("/admin/houses");

  return {
    error: null,
  };
}
