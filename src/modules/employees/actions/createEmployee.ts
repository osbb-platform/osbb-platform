"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
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
  const access = getResolvedAccess(currentUser?.role);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!fullName || !email) {
    return {
      error: "Укажите имя и email сотрудника.",
      success: null,
    };
  }

  const normalizedRole =
    role === ROLES.ADMIN || role === ROLES.MANAGER ? role : null;

  if (!normalizedRole) {
    return {
      error: "Выбрана некорректная роль.",
      success: null,
    };
  }

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

  const { error } = await supabase.from("admin_memberships").insert({
    user_id: null,
    invite_email: email,
    full_name_snapshot: fullName,
    role: normalizedRole,
    status: "invited",
    job_title: jobTitle || null,
    is_active: true,
    invited_by: currentUser.id,
    invited_at: now,
    activated_at: null,
    archived_at: null,
    last_invite_sent_at: null,
    house_id: null,
  });

  if (error) {
    return {
      error: `Не удалось создать сотрудника: ${error.message}`,
      success: null,
    };
  }

  revalidatePath("/admin/employees");

  return {
    error: null,
    success: "Сотрудник успешно создан.",
  };
}
