"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import {
  siteNotificationSettingsSchema,
  type UpdateSiteNotificationSettingsState,
} from "@/src/modules/site/actions/siteNotificationSettingsContract";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export async function updateSiteNotificationSettings(
  _previousState: UpdateSiteNotificationSettingsState,
  formData: FormData,
): Promise<UpdateSiteNotificationSettingsState> {
  const currentUser = await getCurrentAdminUser();

  assertTopLevelAccess(currentUser?.role, "companyPages");

  const parsed = siteNotificationSettingsSchema.safeParse({
    leadNotificationsEnabled:
      formData.get("leadNotificationsEnabled") === "true",
    leadNotifyEmails: formData
      .getAll("leadNotifyEmails")
      .map((value) => String(value)),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Перевірте налаштування одержувачів.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("site_notification_settings")
    .upsert(
      {
        singleton_key: "primary",
        lead_notifications_enabled:
          parsed.data.leadNotificationsEnabled,
        lead_notify_emails: parsed.data.leadNotifyEmails,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "singleton_key",
      },
    );

  if (error) {
    console.error("site notification settings update failed", {
      message: error.message,
    });

    return {
      error:
        "Не вдалося зберегти налаштування. Перевірте, чи застосована міграція.",
      success: null,
    };
  }

  await logPlatformChange({
    actorAdminId: currentUser?.id ?? null,
    actorName:
      currentUser?.fullName ??
      currentUser?.email ??
      "Адміністратор",
    actorEmail: currentUser?.email ?? null,
    actorRole: currentUser?.role ?? null,
    entityType: "site_notification_settings",
    entityId: null,
    entityLabel: "Заявки з сайту",
    actionType: "update_site_notification_settings",
    description:
      "Оновлено налаштування email-сповіщень про заявки з сайту.",
    metadata: {
      sourceType: "cms",
      sourceModule: "site",
      leadNotificationsEnabled:
        parsed.data.leadNotificationsEnabled,
      recipientCount: parsed.data.leadNotifyEmails.length,
    },
  });

  revalidatePath("/admin/company-pages");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: "Налаштування email-сповіщень збережено.",
  };
}
