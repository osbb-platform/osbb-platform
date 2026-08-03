import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const proxy = read("proxy.ts");
const form = read(
  "src/modules/site/components/blocks/LeadForm.tsx",
);
const action = read(
  "src/modules/site/actions/submitSiteLead.ts",
);

describe("site lead form integration", () => {
  it("stores first-touch attribution for 90 days", () => {
    expect(proxy).toContain(
      'SITE_ATTRIBUTION_COOKIE_NAME = "osbb_attr"',
    );
    expect(proxy).toContain(
      "90 * 24 * 60 * 60",
    );
    expect(proxy).toContain(
      "request.cookies.has(SITE_ATTRIBUTION_COOKIE_NAME)",
    );
    expect(proxy).toContain("utm_source");
    expect(proxy).toContain("utm_medium");
    expect(proxy).toContain("utm_campaign");
    expect(proxy).toContain("utm_content");
    expect(proxy).toContain("landing_page");
    expect(proxy).toContain("first_seen_at");
    expect(proxy).toContain('sameSite: "lax"');
  });

  it("does not capture attribution on API or subdomain paths", () => {
    const apiBoundary = proxy.indexOf(
      'if (pathname.startsWith("/api/"))',
    );
    const attributionCall = proxy.indexOf(
      "return withFirstTouchAttribution(",
    );
    const adminBoundary = proxy.indexOf(
      'if (subdomain === "admin")',
    );

    expect(apiBoundary).toBeGreaterThan(-1);
    expect(attributionCall).toBeGreaterThan(apiBoundary);
    expect(adminBoundary).toBeGreaterThan(attributionCall);
  });

  it("connects LeadForm to submitSiteLead", () => {
    expect(form).toContain("useActionState");
    expect(form).toContain("submitSiteLead");
    expect(form).toContain("initialSubmitSiteLeadState");
    expect(form).toContain("satisfies SubmitSiteLeadState");
    expect(form).toContain("<form action={formAction}");
    expect(form).not.toContain("event.preventDefault()");
    expect(form).not.toContain("setIsSubmitted");
  });

  it("passes bot-protection fields from the form", () => {
    expect(form).toContain('name="company_website"');
    expect(form).toContain('name="form_started_at"');
  });

  it("reads attribution from the server-side cookie boundary", () => {
    expect(action).toContain(
      'SITE_ATTRIBUTION_COOKIE_NAME = "osbb_attr"',
    );
    expect(action).toContain("await cookies()");
    expect(action).toContain("readSiteAttributionCookie");
    expect(action).toContain(
      "utm_source: attribution.utm_source",
    );
    expect(action).toContain(
      "first_seen_at: normalizeFirstSeenAt(",
    );

    expect(form).not.toContain('name="utm_source"');
    expect(form).not.toContain("document.cookie");
    expect(form).not.toContain("useEffect");
  });

  it("provides loading and accessible error states", () => {
    expect(form).toContain("disabled={isPending}");
    expect(form).toContain(
      'isPending ? "Надсилаємо..."',
    );
    expect(form).toContain('role="alert"');
    expect(form).toContain("aria-invalid");
    expect(form).toContain("aria-describedby");
  });

  it("normalizes first_seen_at before database insertion", () => {
    expect(action).toContain(
      "function normalizeFirstSeenAt",
    );
    expect(action).toContain(
      "first_seen_at: normalizeFirstSeenAt(",
    );
  });
});
