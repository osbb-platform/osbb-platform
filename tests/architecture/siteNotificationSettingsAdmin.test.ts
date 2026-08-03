import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

const page = read(
  "app/(admin)/admin/(protected)/company-pages/page.tsx",
);
const form = read(
  "src/modules/site/components/admin/SiteLeadNotificationSettingsForm.tsx",
);
const action = read(
  "src/modules/site/actions/updateSiteNotificationSettings.ts",
);
const contract = read(
  "src/modules/site/actions/siteNotificationSettingsContract.ts",
);
const service = read(
  "src/modules/site/services/getSiteNotificationSettings.ts",
);

describe("site notification settings admin integration", () => {
  it("uses the existing company site admin section", () => {
    expect(page).toContain(
      "SiteLeadNotificationSettingsForm",
    );
    expect(page).toContain(
      "getSiteNotificationSettings",
    );
    expect(page).toContain(
      "Заявки та сповіщення",
    );
  });

  it("supports adding and removing multiple recipients", () => {
    expect(form).toContain("function addEmail()");
    expect(form).toContain("function removeEmail(email: string)");
    expect(form).toContain('name="leadNotifyEmails"');
    expect(form).toContain("emails.length >= 10");
  });

  it("validates recipients server-side with Zod", () => {
    expect(contract).toContain('from "zod"');
    expect(contract).toContain(".email(");
    expect(contract).toContain(".min(1,");
    expect(contract).toContain(".max(10,");
    expect(action).toContain(
      "siteNotificationSettingsSchema.safeParse",
    );
  });

  it("requires company-site admin access before writing", () => {
    expect(action).toContain("getCurrentAdminUser()");
    expect(action).toContain(
      'assertTopLevelAccess(currentUser?.role, "companyPages")',
    );
    expect(action).toContain(
      '.from("site_notification_settings")',
    );
  });

  it("keeps notification recipients out of the public CMS service", () => {
    expect(service).toContain(
      'import "server-only"',
    );

    const publicCmsService = read(
      "src/modules/site/services/getSiteCmsContent.ts",
    );

    expect(publicCmsService).not.toContain(
      "lead_notify_emails",
    );
    expect(publicCmsService).not.toContain(
      "site_notification_settings",
    );
  });
});
