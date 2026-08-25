"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { resolveEmployeeMutationScope } from "@/src/modules/employees/services/resolveEmployeeMutationScope";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type CreateEmployeeState = {
  error: string | null;
  success: string | null;
};

export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData,
): Promise<CreateEmployeeState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
    return {
      error: "Недостаточно прав для создания сотрудника.",
      success: null,
    };
  }

  const access = getResolvedAccess(currentUser?.role);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const requestedCityId = String(formData.get("cityId") ?? "").trim();

  if (!fullName || !email) {
    return {
      error: "Укажите имя и email сотрудника.",
      success: null,
    };
  }

  const scope = await resolveEmployeeMutationScope({
    currentUser,
    requestedCityId,
    requestedRole: role,
  });

  if (scope.error || !scope.cityId || !scope.role) {
    return {
      error: scope.error ?? "Не вдалося визначити роль або місто.",
      success: null,
    };
  }

  const normalizedRole = scope.role;
  const cityId = scope.cityId;

  const canCreateTargetRole =
    normalizedRole === ROLES.ADMIN
      ? access.employees.createAdmin
      : access.employees.createManager;

  if (!canCreateTargetRole) {
    return {
      error:
        normalizedRole === ROLES.ADMIN
          ? "Недостаточно прав для создания Admin."
          : "Недостаточно прав для создания сотрудника.",
      success: null,
    };
  }

  if (!currentUser) {
    return {
      error: "Не удалось определить текущего администратора.",
      success: null,
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: existingMembership, error: existingMembershipError } = await supabase
    .from("admin_memberships")
    .select("id")
    .eq("invite_email", email)
    .is("house_id", null)
    .maybeSingle();

  if (existingMembershipError) {
    return {
      error: `Не удалось проверить существующего сотрудника: ${existingMembershipError.message}`,
      success: null,
    };
  }

  if (existingMembership) {
    return {
      error: "Сотрудник с таким email уже существует.",
      success: null,
    };
  }

  const now = new Date().toISOString();

  const { data: createdMembership, error } = await supabase
    .from("admin_memberships")
    .insert({
      user_id: null,
      invite_email: email,
      full_name_snapshot: fullName,
      role: normalizedRole,
      city_id: cityId,
      status: "invited",
      job_title: jobTitle || null,
      is_active: true,
      invited_by: currentUser.id,
      invited_at: now,
      activated_at: null,
      archived_at: null,
      last_invite_sent_at: null,
      house_id: null,
    })
    .select("id, city_id, role, invite_email, full_name_snapshot")
    .single();

  if (error || !createdMembership) {
    return {
      error: `Не удалось создать сотрудника: ${error?.message ?? "Unknown error"}`,
      success: null,
    };
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType: "employee",
    entityId: createdMembership.id,
    entityLabel: fullName,
    actionType: "create_employee",
    description: `Створено співробітника «${fullName}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "employees",
      mainSectionKey: "system",
      subSectionKey: "employees",
      cityId: createdMembership.city_id,
      role: createdMembership.role,
      inviteEmail: createdMembership.invite_email ?? email,
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: "Сотрудник успешно создан.",
  };
}
