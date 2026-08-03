import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "src/modules/site/actions/submitSiteLead.ts",
  ),
  "utf8",
);

describe("site lead submission boundary", () => {
  it("exports only the async server action at runtime", () => {
    expect(source).toContain(
      "export async function submitSiteLead",
    );
    expect(source).not.toContain(
      "export function normalizeUkrainianPhone",
    );
    expect(source).not.toContain(
      "export const initialSubmitSiteLeadState",
    );

    const runtimeExports = [
      ...source.matchAll(
        /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/gm,
      ),
    ].map((match) => match[1]);

    expect(runtimeExports).toEqual(["submitSiteLead"]);
  });

  it("writes only through the existing server-only admin client", () => {
    expect(source).toContain('"use server"');
    expect(source).toContain("createSupabaseAdminClient");
    expect(source).toContain('.from("site_leads")');
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).not.toContain(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("uses Zod for the complete server-side form schema", () => {
    expect(source).toContain('import { z } from "zod"');
    expect(source).toContain(
      "const siteLeadSubmissionSchema = z.object({",
    );
    expect(source).toContain(
      "siteLeadSubmissionSchema.safeParse({",
    );
    expect(source).toContain(
      '.min(2, "Вкажіть ім’я — щонайменше 2 символи.")',
    );
    expect(source).toContain(
      '.max(80, "Ім’я не може перевищувати 80 символів.")',
    );
    expect(source).toMatch(
      /\.max\(\s*1000,/,
    );
  });

  it("normalizes and validates Ukrainian phone numbers", () => {
    expect(source).toContain("normalizeUkrainianPhone");
    expect(source).toContain("/^380\\d{9}$/");
    expect(source).toContain("/^0\\d{9}$/");
    expect(source).toContain("+380XXXXXXXXX");
  });

  it("implements honeypot and minimum-fill-time protection", () => {
    expect(source).toContain('"company_website"');
    expect(source).toContain("MIN_FORM_FILL_MS = 3_000");
    expect(source).toContain('"form_started_at"');
    expect(source).toContain("quietBotSuccess");
  });

  it("rate-limits using a one-way HMAC subject", () => {
    expect(source).toContain('createHmac("sha256", secret)');
    expect(source).toContain('"x-forwarded-for"');
    expect(source).toContain('"cf-connecting-ip"');
    expect(source).toContain('"x-real-ip"');
    expect(source).toContain(
      '.rpc(\n      "consume_site_rate_limit"',
    );
    expect(source).not.toMatch(
      /\.insert\(\{[\s\S]*ip_address/i,
    );
  });

  it("captures the required attribution fields", () => {
    for (const field of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "landing_page",
      "referrer",
      "user_agent",
      "first_seen_at",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("does not expose internal database errors to the visitor", () => {
    expect(source).toContain("console.error");
    expect(source).not.toContain(
      "error: insertError.message",
    );
    expect(source).not.toContain(
      "error: rateError.message",
    );
  });
});
