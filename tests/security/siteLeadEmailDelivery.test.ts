import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(
    resolve(process.cwd(), relativePath),
    "utf8",
  );
}

const action = read(
  "src/modules/site/actions/submitSiteLead.ts",
);
const emailService = read(
  "src/modules/site/services/sendSiteLeadEmailNotifications.ts",
);
const settingsService = read(
  "src/modules/site/services/getSiteNotificationDeliverySettings.ts",
);

describe("site lead email delivery", () => {
  it("loads private recipients through the service-role boundary", () => {
    expect(settingsService).toContain(
      'import "server-only"',
    );
    expect(settingsService).toContain(
      "createSupabaseAdminClient",
    );
    expect(settingsService).toContain(
      '.from("site_notification_settings")',
    );
    expect(settingsService).not.toContain(
      "createSupabasePublicClient",
    );
  });

  it("uses server-only Resend configuration", () => {
    expect(emailService).toContain(
      'import "server-only"',
    );
    expect(emailService).toContain(
      "process.env.RESEND_API_KEY",
    );
    expect(emailService).toContain(
      "process.env.SITE_LEAD_EMAIL_FROM",
    );
    expect(emailService).not.toContain(
      "NEXT_PUBLIC_RESEND",
    );
  });

  it("sends through the Resend email API", () => {
    expect(emailService).toContain(
      '"https://api.resend.com/emails"',
    );
    expect(emailService).toContain(
      "Authorization: `Bearer ${params.apiKey}`",
    );
    expect(emailService).toContain(
      '"Idempotency-Key"',
    );
    expect(emailService).toContain(
      "AbortSignal.timeout(EMAIL_TIMEOUT_MS)",
    );
  });

  it("does not expose recipient addresses to each other", () => {
    expect(emailService).toContain(
      "recipients.map((recipient)",
    );
    expect(emailService).toContain(
      "to: params.recipient",
    );
    expect(emailService).not.toContain(
      "to: recipients",
    );
  });

  it("escapes user-controlled content in HTML", () => {
    expect(emailService).toContain(
      "function escapeHtml",
    );
    expect(emailService).toContain(
      "escapeHtml(textValue(lead.message))",
    );
    expect(emailService).toContain(
      "escapeHtml(value)",
    );
  });

  it("requests the created lead identity after insert", () => {
    expect(action).toContain(
      '.select("id, created_at")',
    );
    expect(action).toContain(
      ".single()",
    );
    expect(action).toContain(
      "data: createdLead",
    );
  });

  it("runs notification delivery only after a successful insert", () => {
    const insertGuard = action.indexOf(
      "if (insertError || !createdLead)",
    );
    const notificationCall = action.indexOf(
      "sendSiteLeadEmailNotifications({",
    );

    expect(insertGuard).toBeGreaterThan(-1);
    expect(notificationCall).toBeGreaterThan(insertGuard);
  });

  it("isolates notification failures from the visitor response", () => {
    expect(action).toContain(
      "await Promise.allSettled([",
    );
    expect(action).toContain(
      "site lead notification pipeline failed",
    );

    const notificationCall = action.indexOf(
      "sendSiteLeadEmailNotifications({",
    );
    const successReturn = action.indexOf(
      '"Дякуємо за заявку. Ми зв’яжемося з вами у робочий час."',
    );

    expect(successReturn).toBeGreaterThan(notificationCall);
  });

  it("skips safely when email configuration is missing", () => {
    expect(emailService).toContain(
      'reason: "missing_email_configuration"',
    );
    expect(emailService).toContain(
      "site lead email notification skipped",
    );
  });
});
