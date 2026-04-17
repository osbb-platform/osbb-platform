"use server";

import { headers } from "next/headers";
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

async function resolveAppOrigin() {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");

  const protocol =
    forwardedProto && forwardedProto.length > 0
      ? forwardedProto
      : process.env.NODE_ENV === "development"
        ? "http"
        : "https";

  const resolvedHost = forwardedHost || host || "localhost:3000";

  return `${protocol}://${resolvedHost}`;
}

export async function sendEmployeeInvite(
  _prevState: SendEmployeeInviteState,
  formData: FormData,
): Promise<SendEmployeeInviteState> {
  const currentUser = await getCurrentAdminUser();
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
      "id, invite_email, full_name_snapshot, role, status, invited_at, user_id, last_invite_sent_at",
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

  const inviteEmail = String(membership.invite_email ?? "").trim().toLowerCase();

  const lastInviteSentAt = membership.last_invite_sent_at
    ? new Date(membership.last_invite_sent_at)
    : null;

  if (lastInviteSentAt) {
    const cooldownMs = 5 * 60 * 1000;
    const nextAllowedAt = lastInviteSentAt.getTime() + cooldownMs;

    if (Date.now() < nextAllowedAt) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((nextAllowedAt - Date.now()) / 60000),
      );

      return {
        error: `Повторный инвайт будет доступен через ${remainingMinutes} мин.`,
        success: null,
      };
    }
  }

  if (!inviteEmail) {
    return {
      error: "У сотрудника не указан email для приглашения.",
      success: null,
    };
  }

  if (membership.status === "active" && membership.user_id) {
    return {
      error: "Этот сотрудник уже завершил регистрацию. Повторный инвайт не нужен.",
      success: null,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const origin = await resolveAppOrigin();

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
      error:
        "Не удалось отправить приглашение. Проверьте email сотрудника и повторите попытку позже.",
      success: null,
    };
  }

  const inviteTimestamp = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("admin_memberships")
    .update({
      status: "invited",
      invited_at:
        membership.status === "invited"
          ? membership.invited_at ?? inviteTimestamp
          : inviteTimestamp,
      last_invite_sent_at: inviteTimestamp,
      is_active: true,
    })
    .eq("id", membershipId);

  if (updateError) {
    return {
      error: `Инвайт отправлен, но статус не обновился: ${updateError.message}`,
      success: null,
    };
  }

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
    description: `Отправлено приглашение сотруднику «${membership.full_name_snapshot ?? inviteEmail}».`,
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
    success: "Инвайт отправлен на почту сотрудника.",
  };
}
