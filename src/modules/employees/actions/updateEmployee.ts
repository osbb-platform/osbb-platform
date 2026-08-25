"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import {
  canMutateEmployeeInCity,
  resolveEmployeeMutationScope,
} from "@/src/modules/employees/services/resolveEmployeeMutationScope";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type UpdateEmployeeState = {
  error: string | null;
  success: string | null;
};

export async function updateEmployee(
  _prevState: UpdateEmployeeState,
  formData: FormData,
): Promise<UpdateEmployeeState> {
  const currentUser = await getCurrentAdminUser();

  if (
    !currentUser ||
    (currentUser.role !== ROLES.ADMIN &&
      currentUser.role !== ROLES.SUPERADMIN)
  ) {
    return {
      error: "Недостатньо прав для редагування співробітника.",
      success: null,
    };
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const requestedCityId = String(formData.get("cityId") ?? "").trim();

  if (!membershipId) {
    return {
      error: "Не передано ідентифікатор співробітника.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: membership, error: membershipError } = await supabase
    .from("admin_memberships")
    .select(
      "id, user_id, invite_email, full_name_snapshot, role, city_id, house_id",
    )
    .eq("id", membershipId)
    .is("house_id", null)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      error:
        membershipError?.message ??
        "Не вдалося знайти співробітника для редагування.",
      success: null,
    };
  }

  if (membership.role === ROLES.SUPERADMIN) {
    return {
      error: "Superadmin не редагується через реєстр співробітників.",
      success: null,
    };
  }

  if (
    membership.user_id &&
    membership.user_id === currentUser.id &&
    currentUser.role !== ROLES.SUPERADMIN
  ) {
    return {
      error: "City-admin не може змінювати власну роль або місто.",
      success: null,
    };
  }

  const canMutateExisting = await canMutateEmployeeInCity({
    currentUser,
    employeeCityId: membership.city_id ?? null,
  });

  if (!canMutateExisting) {
    return {
      error: "Співробітник належить до іншого міста.",
      success: null,
    };
  }

  const scope = await resolveEmployeeMutationScope({
    currentUser,
    requestedCityId,
    requestedRole,
  });

  if (scope.error || !scope.cityId || !scope.role) {
    return {
      error: scope.error ?? "Не вдалося визначити роль або місто.",
      success: null,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("admin_memberships")
    .update({
      role: scope.role,
      city_id: scope.cityId,
    })
    .eq("id", membership.id)
    .select("id, role, city_id, invite_email, full_name_snapshot")
    .maybeSingle();

  if (updateError || !updated) {
    return {
      error:
        updateError?.message ??
        "Не вдалося оновити роль та місто співробітника.",
      success: null,
    };
  }

  const entityLabel =
    updated.full_name_snapshot ??
    updated.invite_email ??
    "Співробітник";

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType: "employee",
    entityId: updated.id,
    entityLabel,
    actionType: "update_employee",
    description: `Оновлено роль та місто співробітника «${entityLabel}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "employees",
      mainSectionKey: "system",
      subSectionKey: "employees",
      cityId: updated.city_id,
      previousCityId: membership.city_id ?? null,
      role: updated.role,
      previousRole: membership.role ?? null,
      inviteEmail: updated.invite_email ?? null,
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: "Роль та місто співробітника оновлено.",
  };
}
