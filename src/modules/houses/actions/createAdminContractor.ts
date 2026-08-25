"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type CreateAdminContractorResult = {
  data: {
    id: string;
    name: string;
    cityId: string;
  } | null;
  error: string | null;
};

const ALLOWED_CREATE_ROLES = new Set<string>([
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.CONTENT_MANAGER,
]);

export async function createAdminContractor(
  rawName: string,
): Promise<CreateAdminContractorResult> {
  const [currentUser, cityContext] = await Promise.all([
    getCurrentAdminUser(),
    getAdminCityContext(),
  ]);

  if (
    !currentUser ||
    !currentUser.role ||
    !ALLOWED_CREATE_ROLES.has(currentUser.role) ||
    !cityContext
  ) {
    return {
      data: null,
      error: "Недостатньо прав або не визначено активне місто.",
    };
  }

  const name = rawName.trim().replace(/\s+/g, " ");

  if (!name) {
    return {
      data: null,
      error: "Вкажіть назву підрядника.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("contractors")
    .insert({
      name,
      normalized_name: name.toLocaleLowerCase("uk-UA"),
      city_id: cityContext.cityId,
      is_active: true,
      created_by: currentUser.id,
    })
    .select("id, name, city_id")
    .single();

  if (error || !data) {
    return {
      data: null,
      error:
        error?.code === "23505"
          ? "Такий підрядник уже є у списку частих для цього міста."
          : error?.message ?? "Не вдалося додати підрядника.",
    };
  }

  revalidatePath("/admin/houses");

  return {
    data: {
      id: data.id,
      name: data.name,
      cityId: data.city_id,
    },
    error: null,
  };
}
