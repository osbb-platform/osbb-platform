"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type DeleteEmployeeState = {
  error: string | null;
  success: string | null;
};

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName?.trim() || params.email?.trim() || "Сотрудник CMS";
}

async function findAuthUserIdByEmail(
  email: string,
  supabase = createSupabaseAdminClient(),
) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Не удалось получить список auth users: ${error.message}`);
    }

    const matchedUser = data.users.find(
      (user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail,
    );

    if (matchedUser) {
      return matchedUser.id;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function hasRemainingEmployeeLinks(params: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  userId: string | null;
  inviteEmail: string | null;
}) {
  const { supabase, userId, inviteEmail } = params;

  if (userId) {
    const { data, error } = await supabase
      .from("admin_memberships")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      throw new Error(
        `Не удалось проверить остаточные membership по user_id: ${error.message}`,
      );
    }

    if (data?.length) return true;
  }

  if (inviteEmail) {
    const { data, error } = await supabase
      .from("admin_memberships")
      .select("id")
      .eq("invite_email", inviteEmail)
      .is("house_id", null)
      .limit(1);

    if (error) {
      throw new Error(
        `Не удалось проверить остаточные membership по invite_email: ${error.message}`,
      );
    }

    if (data?.length) return true;
  }

  return false;
}

export async function deleteEmployee(
  _prevState: DeleteEmployeeState,
  formData: FormData,
): Promise<DeleteEmployeeState> {
  const currentUser = await getCurrentAdminUser();
  const access = getResolvedAccess(currentUser?.role);

  const membershipId = String(formData.get("membershipId") ?? "").trim();

  if (!membershipId) {
    return {
      error: "Не передан идентификатор сотрудника.",
      success: null,
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: membership, error: membershipError } = await supabase
    .from("admin_memberships")
    .select(`
      id,
      user_id,
      role,
      status,
      invite_email,
      full_name_snapshot,
      house_id,
      invited_by
    `)
    .eq("id", membershipId)
    .is("house_id", null)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      error:
        membershipError?.message ??
        "Не удалось найти сотрудника для удаления.",
      success: null,
    };
  }

  const isSuperadminTarget = membership.role === ROLES.SUPERADMIN;
  const canDeleteTarget = isSuperadminTarget
    ? access.employees.deleteSuperadmin
    : access.employees.delete;

  if (!canDeleteTarget) {
    return {
      error: "Недостаточно прав для удаления сотрудника.",
      success: null,
    };
  }

  if (membership.user_id && membership.user_id === currentUser?.id) {
    return {
      error: "Нельзя удалить собственную учетку из текущей сессии.",
      success: null,
    };
  }

  if (
    currentUser?.role !== ROLES.SUPERADMIN &&
    membership.invited_by &&
    membership.invited_by !== currentUser?.id
  ) {
    return {
      error: "Вы можете удалять только сотрудников, которых пригласили сами.",
      success: null,
    };
  }

  const inviteEmailRaw = String(membership.invite_email ?? "").trim();
  const inviteEmail = inviteEmailRaw ? inviteEmailRaw.toLowerCase() : null;
  const entityLabel =
    membership.full_name_snapshot ?? inviteEmail ?? "Сотрудник";

  let targetAuthUserId = membership.user_id ?? null;

  if (!targetAuthUserId && inviteEmail) {
    targetAuthUserId = await findAuthUserIdByEmail(inviteEmail, supabase);
  }

  const { error: membershipDeleteError } = await supabase
    .from("admin_memberships")
    .delete()
    .eq("id", membership.id);

  if (membershipDeleteError) {
    return {
      error: `Не удалось удалить employee membership: ${membershipDeleteError.message}`,
      success: null,
    };
  }

  let deletedAuthUser = false;
  let deletedProfile = false;

  const hasRemainingLinks = await hasRemainingEmployeeLinks({
    supabase,
    userId: targetAuthUserId,
    inviteEmail,
  });

  if (!hasRemainingLinks && targetAuthUserId) {
    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", targetAuthUserId);

    if (!profileDeleteError) {
      deletedProfile = true;
    }

    const { error: authDeleteError } =
      await supabase.auth.admin.deleteUser(targetAuthUserId);

    if (authDeleteError) {
      return {
        error: `Membership удален, но auth user не удалился: ${authDeleteError.message}`,
        success: null,
      };
    }

    deletedAuthUser = true;
  }

  await logPlatformChange({
    actorAdminId: currentUser?.id ?? null,
    actorName: getActorDisplayName({
      fullName: currentUser?.fullName ?? null,
      email: currentUser?.email ?? null,
    }),
    actorEmail: currentUser?.email ?? null,
    actorRole: currentUser?.role ?? null,
    entityType: "employee",
    entityId: membership.id,
    entityLabel,
    actionType: "delete_employee",
    description: `Сотрудник «${entityLabel}» удален из системы.`,
    metadata: {
      sourceType: "cms",
      sourceModule: "employees",
      mainSectionKey: "system",
      subSectionKey: "employees",
      inviteEmail: inviteEmail || null,
      role: membership.role ?? null,
      status: membership.status ?? null,
      deletedAuthUser,
      deletedProfile,
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/history");

  return {
    error: null,
    success:
      deletedAuthUser || !inviteEmail
        ? "Сотрудник полностью удален. Почта снова свободна для нового инвайта."
        : "Сотрудник удален. Связанных auth users для этой почты не найдено, почта должна быть свободна.",
  };
}
