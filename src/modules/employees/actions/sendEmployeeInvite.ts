"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

export type SendEmployeeInviteState = {
  error: string | null;
  success: string | null;
};

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName?.trim() || params.email?.trim() || "Сотрудник CMS";
}

function getAdminOrigin() {
  const domain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;

  if (!domain) {
    throw new Error("Missing NEXT_PUBLIC_ADMIN_DOMAIN");
  }

  return `https://${domain}`;
}

export async function sendEmployeeInvite(
  _prevState: SendEmployeeInviteState,
  formData: FormData,
): Promise<SendEmployeeInviteState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
    return {
      error: "Недостаточно прав для отправки инвайта.",
      success: null,
    };
  }

  const access = getResolvedAccess(currentUser?.role);

  const membershipId = String(formData.get("membershipId") ?? "").trim();

  if (!membershipId) {
    return {
      error: "Не передан идентификатор сотрудника.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: membership, error: membershipError } = await supabase
    .from("admin_memberships")
    .select(
      "id, invite_email, full_name_snapshot, role, status, invited_at, user_id, last_invite_sent_at, invited_by",
    )
    .eq("id", membershipId)
    .is("house_id", null)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      error:
        membershipError?.message ??
        "Не удалось найти сотрудника для отправки приглашения.",
      success: null,
    };
  }

  const isAdminTarget = membership.role === ROLES.ADMIN;
  const canResendInvite = isAdminTarget
    ? access.employees.inviteAdmin
    : access.employees.resendInvite;

  if (!canResendInvite) {
    return {
      error: "У вас нет доступа к отправке инвайтов.",
      success: null,
    };
  }

  if (
    currentUser?.role !== ROLES.SUPERADMIN &&
    membership.invited_by &&
    membership.invited_by !== currentUser?.id
  ) {
    return {
      error: "Вы можете отправлять приглашения только своим сотрудникам.",
      success: null,
    };
  }

  const inviteEmail = String(membership.invite_email ?? "").trim().toLowerCase();

  if (!inviteEmail) {
    return {
      error: "У сотрудника не указан email для приглашения.",
      success: null,
    };
  }

  if (membership.status === "active" && membership.user_id) {
    return {
      error: "Этот сотрудник уже завершил регистрацию.",
      success: null,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const origin = getAdminOrigin();

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    inviteEmail,
    {
      redirectTo: `${origin}${ROUTES.admin.completeRegistration}`,
      data: {
        full_name: membership.full_name_snapshot ?? null,
        role: membership.role ?? null,
      },
    },
  );

  if (inviteError) {
    return {
      error: "Не удалось отправить приглашение.",
      success: null,
    };
  }

  const inviteTimestamp = new Date().toISOString();

  await supabase
    .from("admin_memberships")
    .update({
      status: "invited",
      last_invite_sent_at: inviteTimestamp,
      is_active: true,
    })
    .eq("id", membershipId);

  const actorName = getActorDisplayName({
    fullName: currentUser?.fullName ?? null,
    email: currentUser?.email ?? null,
  });

  await logPlatformChange({
    actorAdminId: currentUser?.id ?? null,
    actorName,
    actorEmail: currentUser?.email ?? null,
    actorRole: currentUser?.role ?? null,
    entityType: "employee",
    entityId: membership.id,
    entityLabel: membership.full_name_snapshot ?? inviteEmail,
    actionType: "invite_employee",
    description: `Надіслано запрошення співробітнику «${membership.full_name_snapshot ?? inviteEmail}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "employees",
      mainSectionKey: "system",
      subSectionKey: "employees",
      inviteEmail,
      role: membership.role ?? null,
    },
  });

  revalidatePath(ROUTES.admin.employees);

  return {
    error: null,
    success: "Инвайт отправлен.",
  };
}
