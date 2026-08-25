import "server-only";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { ROLES, type AdminRole } from "@/src/shared/constants/roles/roles.constants";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";

export type EmployeeMutationScopeResult =
  | { cityId: string; role: AdminRole; error: null }
  | { cityId: null; role: null; error: string };

function normalizeAssignableRole(value: string): AdminRole | null {
  if (
    value === ROLES.ADMIN ||
    value === ROLES.MANAGER ||
    value === ROLES.CONTENT_MANAGER
  ) {
    return value;
  }

  return null;
}

export async function resolveEmployeeMutationScope(params: {
  currentUser: CurrentAdminUser;
  requestedCityId: string;
  requestedRole: string;
}): Promise<EmployeeMutationScopeResult> {
  if (
    params.currentUser.role !== ROLES.SUPERADMIN &&
    params.currentUser.role !== ROLES.ADMIN
  ) {
    return {
      cityId: null,
      role: null,
      error: "Недостатньо прав для керування співробітниками.",
    };
  }

  const role = normalizeAssignableRole(params.requestedRole.trim());

  if (!role) {
    return {
      cityId: null,
      role: null,
      error: "Обрана некоректна роль співробітника.",
    };
  }

  const cityContext = await getAdminCityContext();

  if (!cityContext) {
    return {
      cityId: null,
      role: null,
      error: "Не вдалося визначити активне місто.",
    };
  }

  const requestedCityId = params.requestedCityId.trim();

  if (!requestedCityId) {
    return {
      cityId: null,
      role: null,
      error: "Оберіть місто співробітника.",
    };
  }

  if (params.currentUser.role === ROLES.ADMIN) {
    if (requestedCityId !== cityContext.cityId) {
      return {
        cityId: null,
        role: null,
        error: "City-admin може керувати співробітниками тільки свого міста.",
      };
    }

    return {
      cityId: cityContext.cityId,
      role,
      error: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: city, error } = await supabase
    .from("cities")
    .select("id")
    .eq("id", requestedCityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !city) {
    return {
      cityId: null,
      role: null,
      error: "Обране місто недоступне.",
    };
  }

  return {
    cityId: requestedCityId,
    role,
    error: null,
  };
}

export async function canMutateEmployeeInCity(params: {
  currentUser: CurrentAdminUser;
  employeeCityId: string | null;
}) {
  if (params.currentUser.role === ROLES.SUPERADMIN) {
    return true;
  }

  if (params.currentUser.role !== ROLES.ADMIN) {
    return false;
  }

  const cityContext = await getAdminCityContext();

  return Boolean(
    cityContext &&
      params.employeeCityId &&
      params.employeeCityId === cityContext.cityId,
  );
}
