import "server-only";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import {
  DEFAULT_SITE_LEAD_NOTIFY_EMAIL,
  type SiteNotificationSettings,
} from "@/src/modules/site/actions/siteNotificationSettingsContract";

const fallbackSettings: SiteNotificationSettings = {
  leadNotificationsEnabled: true,
  leadNotifyEmails: [DEFAULT_SITE_LEAD_NOTIFY_EMAIL],
};

function isMissingTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

export async function getSiteNotificationSettings(): Promise<SiteNotificationSettings> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("site_notification_settings")
    .select("lead_notifications_enabled, lead_notify_emails")
    .eq("singleton_key", "primary")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) {
      return fallbackSettings;
    }

    throw new Error(
      `Failed to load site notification settings: ${error.message}`,
    );
  }

  if (!data) {
    return fallbackSettings;
  }

  const emails = Array.isArray(data.lead_notify_emails)
    ? data.lead_notify_emails
        .filter((email): email is string => typeof email === "string")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return {
    leadNotificationsEnabled:
      data.lead_notifications_enabled !== false,
    leadNotifyEmails:
      emails.length > 0
        ? [...new Set(emails)]
        : [DEFAULT_SITE_LEAD_NOTIFY_EMAIL],
  };
}
