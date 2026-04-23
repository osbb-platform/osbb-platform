"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type FinalizeAdminRegistrationResult = {
  error: string | null;
};

export async function finalizeAdminRegistration(): Promise<FinalizeAdminRegistrationResult> {
  const actionClient = await createSupabaseActionClient();

  const {
    data: { user },
    error: userError,
  } = await actionClient.auth.getUser();

  if (userError || !user) {
    return {
      error: "Не вдалося завершити вхід. Спробуйте ще раз.",
    };
  }

  const email = String(user.email ?? "").trim().toLowerCase();

  if (!email) {
    return {
      error: "Не вдалося визначити електронну пошту.",
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("admin_memberships")
    .select(
      "id, full_name_snapshot, role, status, invite_email, user_id, created_at",
    )
    .is("house_id", null)
    .or(`invite_email.eq.${email},user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (membershipError) {
    return {
      error: `Сталася помилка. Спробуйте ще раз.`,
    };
  }

  const membership =
    memberships?.find((item) => item.user_id === user.id) ??
    memberships?.find(
      (item) =>
        String(item.invite_email ?? "").trim().toLowerCase() === email,
    ) ??
    null;

  if (!membership) {
    return {
      error: "Не вдалося знайти ваш профіль. Зверніться до адміністратора.",
    };
  }

  const activationTimestamp = new Date().toISOString();

  const { error: membershipUpdateError } = await supabase
    .from("admin_memberships")
    .update({
      user_id: user.id,
      status: "active",
      activated_at: activationTimestamp,
      is_active: true,
    })
    .eq("id", membership.id);

  if (membershipUpdateError) {
    return {
      error: `Не вдалося завершити реєстрацію. Спробуйте ще раз.`,
    };
  }

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: membership.full_name_snapshot ?? null,
    },
    {
      onConflict: "id",
    },
  );

  await logPlatformChange({
    actorAdminId: user.id,
    actorName: membership.full_name_snapshot ?? email,
    actorEmail: email,
    actorRole: membership.role ?? null,
    entityType: "employee",
    entityId: membership.id,
    entityLabel: membership.full_name_snapshot ?? email,
    actionType: "activate_employee",
    description: `Співробітник «${membership.full_name_snapshot ?? email}» завершив реєстрацію.`,
    metadata: {
      sourceType: "cms",
      sourceModule: "employees",
      mainSectionKey: "system",
      subSectionKey: "employees",
      inviteEmail: email,
      role: membership.role ?? null,
      status: "active",
    },
  });

  revalidatePath(ROUTES.admin.employees);
  revalidatePath(ROUTES.admin.profile);

  return {
    error: null,
  };
}
