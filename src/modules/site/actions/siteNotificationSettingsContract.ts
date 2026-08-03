import { z } from "zod";

export const DEFAULT_SITE_LEAD_NOTIFY_EMAIL =
  "osbb.platform.project@gmail.com";

export const siteNotificationSettingsSchema = z.object({
  leadNotificationsEnabled: z.boolean(),
  leadNotifyEmails: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .email("Вкажіть коректну email-адресу."),
    )
    .min(1, "Додайте щонайменше одну email-адресу.")
    .max(10, "Можна додати не більше 10 email-адрес.")
    .transform((emails) => [...new Set(emails)]),
});

export type SiteNotificationSettings = {
  leadNotificationsEnabled: boolean;
  leadNotifyEmails: string[];
};

export type UpdateSiteNotificationSettingsState = {
  error: string | null;
  success: string | null;
};
