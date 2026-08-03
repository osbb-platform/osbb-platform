import "server-only";

import { createHash } from "node:crypto";

import { getSiteNotificationDeliverySettings } from "@/src/modules/site/services/getSiteNotificationDeliverySettings";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 8_000;

type SiteLeadEmailPayload = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  city: string;
  role: string;
  message: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  referrer: string | null;
};

type ResendApiResponse = {
  id?: string;
  message?: string;
  name?: string;
};

const roleLabels: Record<string, string> = {
  head: "Голова ОСББ",
  manager: "Управляюча компанія",
  board_member: "Член правління",
  resident: "Мешканець",
  other: "Інше",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textValue(value: string | null, fallback = "Не вказано") {
  const normalized = value?.trim();
  return normalized || fallback;
}

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  });
}

function buildSubject(lead: SiteLeadEmailPayload) {
  return `Нова заявка з сайту — ${lead.name}, ${lead.city}`;
}

function buildText(lead: SiteLeadEmailPayload) {
  const role = roleLabels[lead.role] ?? lead.role;
  const source = [
    textValue(lead.utmSource, ""),
    textValue(lead.utmMedium, ""),
  ]
    .filter(Boolean)
    .join(" / ");

  return [
    "Нова заявка з сайту OSBB Platform",
    "",
    `Ім’я: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Місто: ${lead.city}`,
    `Роль: ${role}`,
    "",
    "Повідомлення:",
    textValue(lead.message),
    "",
    `UTM-джерело: ${source || "Не вказано"}`,
    `UTM-кампанія: ${textValue(lead.utmCampaign)}`,
    `Сторінка: ${textValue(lead.landingPage)}`,
    `Referrer: ${textValue(lead.referrer)}`,
    "",
    `ID заявки: ${lead.id}`,
    `Час: ${formatCreatedAt(lead.createdAt)}`,
  ].join("\n");
}

function buildHtml(lead: SiteLeadEmailPayload) {
  const role = roleLabels[lead.role] ?? lead.role;
  const source = [
    textValue(lead.utmSource, ""),
    textValue(lead.utmMedium, ""),
  ]
    .filter(Boolean)
    .join(" / ");

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;color:#64748b;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:8px 12px;color:#172033;font-weight:600;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;

  return `
    <!doctype html>
    <html lang="uk">
      <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
          <div style="padding:24px;background:#172033;color:#ffffff;">
            <div style="font-size:13px;opacity:.75;">OSBB Platform</div>
            <h1 style="margin:8px 0 0;font-size:24px;">
              Нова заявка з сайту
            </h1>
          </div>

          <div style="padding:20px 24px;">
            <table style="width:100%;border-collapse:collapse;">
              ${row("Ім’я", lead.name)}
              ${row("Телефон", lead.phone)}
              ${row("Місто", lead.city)}
              ${row("Роль", role)}
              ${row("UTM-джерело", source || "Не вказано")}
              ${row("UTM-кампанія", textValue(lead.utmCampaign))}
              ${row("Сторінка", textValue(lead.landingPage))}
              ${row("Referrer", textValue(lead.referrer))}
              ${row("ID заявки", lead.id)}
              ${row("Час", formatCreatedAt(lead.createdAt))}
            </table>

            <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
              <div style="font-size:13px;color:#64748b;margin-bottom:8px;">
                Повідомлення
              </div>
              <div style="white-space:pre-wrap;line-height:1.6;">
                ${escapeHtml(textValue(lead.message))}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildIdempotencyKey(leadId: string, recipient: string) {
  const recipientHash = createHash("sha256")
    .update(recipient)
    .digest("hex")
    .slice(0, 16);

  return `site-lead-${leadId}-${recipientHash}`;
}

async function sendOneEmail(params: {
  apiKey: string;
  from: string;
  recipient: string;
  lead: SiteLeadEmailPayload;
}) {
  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": buildIdempotencyKey(
        params.lead.id,
        params.recipient,
      ),
    },
    body: JSON.stringify({
      from: params.from,
      to: params.recipient,
      subject: buildSubject(params.lead),
      text: buildText(params.lead),
      html: buildHtml(params.lead),
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    cache: "no-store",
  });

  const payload = (await response
    .json()
    .catch(() => ({}))) as ResendApiResponse;

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.name ||
        `Resend request failed with status ${response.status}`,
    );
  }

  return payload.id ?? null;
}

export async function sendSiteLeadEmailNotifications(
  lead: SiteLeadEmailPayload,
) {
  const settings = await getSiteNotificationDeliverySettings();

  if (!settings.leadNotificationsEnabled) {
    return {
      skipped: true,
      reason: "disabled",
      attempted: 0,
      sent: 0,
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SITE_LEAD_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    console.warn("site lead email notification skipped", {
      reason: "missing_email_configuration",
      leadId: lead.id,
    });

    return {
      skipped: true,
      reason: "missing_email_configuration",
      attempted: 0,
      sent: 0,
    };
  }

  const recipients = settings.leadNotifyEmails.slice(0, 10);

  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendOneEmail({
        apiKey,
        from,
        recipient,
        lead,
      }),
    ),
  );

  let sent = 0;

  results.forEach((result, index) => {
    const recipient = recipients[index] ?? "unknown";

    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }

    console.error("site lead email notification failed", {
      leadId: lead.id,
      recipient,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown email error",
    });
  });

  return {
    skipped: false,
    reason: null,
    attempted: recipients.length,
    sent,
  };
}
