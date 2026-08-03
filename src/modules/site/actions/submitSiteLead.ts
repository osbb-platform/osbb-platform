"use server";

import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

const MIN_FORM_FILL_MS = 3_000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1_000;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const SITE_ATTRIBUTION_COOKIE_NAME = "osbb_attr";

type SiteAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  first_seen_at: string | null;
};

const emptyAttribution: SiteAttribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  landing_page: null,
  referrer: null,
  first_seen_at: null,
};

const allowedRoles = new Set([
  "head",
  "manager",
  "board_member",
  "resident",
  "other",
]);

const legacyRoleMap: Record<string, string> = {
  "Голова ОСББ": "head",
  "Член правління": "board_member",
  "Управляюча компанія": "manager",
  "Мешканець": "resident",
  "Інше": "other",
};

export type SiteLeadField =
  | "name"
  | "phone"
  | "city"
  | "role"
  | "message";

export type SubmitSiteLeadState = {
  ok: boolean;
  error: string | null;
  successMessage: string | null;
  fieldErrors: Partial<Record<SiteLeadField, string>>;
  retryAfterSeconds: number | null;
};

function value(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizeUkrainianPhone(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");

  if (/^380\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^0\d{9}$/.test(digits)) {
    return `+38${digits}`;
  }

  return null;
}

function normalizeRole(rawRole: string) {
  const mapped = legacyRoleMap[rawRole] ?? rawRole;
  return allowedRoles.has(mapped) ? mapped : null;
}

const siteLeadSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Вкажіть ім’я — щонайменше 2 символи.")
    .max(80, "Ім’я не може перевищувати 80 символів."),

  phone: z
    .string()
    .trim()
    .max(40, "Номер телефону має некоректний формат.")
    .refine(
      (rawPhone) => normalizeUkrainianPhone(rawPhone) !== null,
      "Вкажіть український номер у форматі +380XXXXXXXXX.",
    )
    .transform((rawPhone) => normalizeUkrainianPhone(rawPhone) as string),

  city: z
    .string()
    .trim()
    .min(2, "Вкажіть місто.")
    .max(80, "Назва міста не може перевищувати 80 символів."),

  role: z
    .string()
    .trim()
    .max(40, "Оберіть вашу роль.")
    .refine(
      (rawRole) => normalizeRole(rawRole) !== null,
      "Оберіть вашу роль.",
    )
    .transform((rawRole) => normalizeRole(rawRole) as string),

  message: z
    .string()
    .trim()
    .max(
      1000,
      "Повідомлення не може перевищувати 1000 символів.",
    )
    .transform((message) => message || null),
});

type ValidSiteLeadSubmission = {
  valid: true;
  fieldErrors: SubmitSiteLeadState["fieldErrors"];
  data: {
    name: string;
    phone: string;
    phoneRaw: string;
    city: string;
    role: string;
    message: string | null;
  };
};

type InvalidSiteLeadSubmission = {
  valid: false;
  fieldErrors: SubmitSiteLeadState["fieldErrors"];
  data: null;
};

function validateSubmission(
  formData: FormData,
): ValidSiteLeadSubmission | InvalidSiteLeadSubmission {
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  const result = siteLeadSubmissionSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: phoneRaw,
    city: String(formData.get("city") ?? ""),
    role: String(formData.get("role") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  if (!result.success) {
    const fieldErrors: SubmitSiteLeadState["fieldErrors"] = {};

    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (
        typeof field === "string" &&
        ["name", "phone", "city", "role", "message"].includes(field) &&
        !fieldErrors[field as SiteLeadField]
      ) {
        fieldErrors[field as SiteLeadField] = issue.message;
      }
    }

    return {
      valid: false,
      fieldErrors,
      data: null,
    };
  }

  return {
    valid: true,
    fieldErrors: {},
    data: {
      ...result.data,
      phoneRaw: phoneRaw.slice(0, 40),
    },
  };
}

function getClientIp(headerStore: Awaited<ReturnType<typeof headers>>) {
  const forwarded = headerStore.get("x-forwarded-for");
  const forwardedIp = forwarded?.split(",")[0]?.trim();

  return (
    forwardedIp ||
    headerStore.get("cf-connecting-ip")?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function hashRateLimitSubject(ip: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createHmac("sha256", secret)
    .update(`site-lead:${ip}`)
    .digest("hex");
}

function normalizeAttributionText(
  value: unknown,
  maxLength: number,
) {
  const normalized = String(value ?? "").trim().slice(0, maxLength);
  return normalized || null;
}

async function readSiteAttributionCookie(): Promise<SiteAttribution> {
  const cookieStore = await cookies();
  const rawValue =
    cookieStore.get(SITE_ATTRIBUTION_COOKIE_NAME)?.value ?? "";

  if (!rawValue) {
    return emptyAttribution;
  }

  let parsedValue = rawValue;

  try {
    parsedValue = decodeURIComponent(rawValue);
  } catch {
    parsedValue = rawValue;
  }

  try {
    const parsed = JSON.parse(parsedValue) as Record<string, unknown>;

    return {
      utm_source: normalizeAttributionText(parsed.utm_source, 200),
      utm_medium: normalizeAttributionText(parsed.utm_medium, 200),
      utm_campaign: normalizeAttributionText(parsed.utm_campaign, 200),
      utm_content: normalizeAttributionText(parsed.utm_content, 200),
      landing_page: normalizeAttributionText(parsed.landing_page, 1000),
      referrer: normalizeAttributionText(parsed.referrer, 1000),
      first_seen_at: normalizeAttributionText(parsed.first_seen_at, 40),
    };
  } catch {
    return emptyAttribution;
  }
}

function parseFormStartedAt(formData: FormData) {
  const raw = Number(formData.get("form_started_at"));

  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return raw;
}

function normalizeFirstSeenAt(raw: string | null) {
  if (!raw) {
    return new Date().toISOString();
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function quietBotSuccess(): SubmitSiteLeadState {
  return {
    ok: true,
    error: null,
    successMessage:
      "Дякуємо. Вашу заявку прийнято.",
    fieldErrors: {},
    retryAfterSeconds: null,
  };
}

export async function submitSiteLead(
  _previousState: SubmitSiteLeadState,
  formData: FormData,
): Promise<SubmitSiteLeadState> {
  const honeypot = value(formData, "company_website", 200);

  if (honeypot) {
    return quietBotSuccess();
  }

  const formStartedAt = parseFormStartedAt(formData);
  const now = Date.now();

  if (
    formStartedAt === null ||
    now - formStartedAt < MIN_FORM_FILL_MS ||
    now - formStartedAt > MAX_FORM_AGE_MS
  ) {
    return quietBotSuccess();
  }

  const validation = validateSubmission(formData);

  if (!validation.valid) {
    return {
      ok: false,
      error: "Перевірте заповнені поля.",
      successMessage: null,
      fieldErrors: validation.fieldErrors,
      retryAfterSeconds: null,
    };
  }

  try {
    const [headerStore, attribution] = await Promise.all([
      headers(),
      readSiteAttributionCookie(),
    ]);

    const userAgent =
      headerStore.get("user-agent")?.trim().slice(0, 500) || null;
    const subjectHash = hashRateLimitSubject(
      getClientIp(headerStore),
    );

    const supabase = createSupabaseAdminClient();

    const { data: rateRows, error: rateError } = await supabase.rpc(
      "consume_site_rate_limit",
      {
        p_scope: "site_lead_submit",
        p_subject_hash: subjectHash,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
        p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
      },
    );

    if (rateError) {
      console.error("site lead rate limit failed", {
        message: rateError.message,
      });

      return {
        ok: false,
        error:
          "Не вдалося надіслати заявку. Спробуйте ще раз трохи пізніше.",
        successMessage: null,
        fieldErrors: {},
        retryAfterSeconds: null,
      };
    }

    const rateResult = Array.isArray(rateRows)
      ? rateRows[0]
      : null;

    if (!rateResult?.allowed) {
      return {
        ok: false,
        error:
          "Забагато спроб. Спробуйте надіслати заявку трохи пізніше.",
        successMessage: null,
        fieldErrors: {},
        retryAfterSeconds: Number(
          rateResult?.retry_after_seconds ?? 600,
        ),
      };
    }

    const { error: insertError } = await supabase
      .from("site_leads")
      .insert({
        name: validation.data.name,
        phone: validation.data.phone,
        phone_raw: validation.data.phoneRaw,
        city: validation.data.city,
        role: validation.data.role,
        message: validation.data.message,
        lead_type: "connect",
        status: "new",
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        landing_page: attribution.landing_page,
        referrer: attribution.referrer,
        user_agent: userAgent,
        first_seen_at: normalizeFirstSeenAt(
          attribution.first_seen_at,
        ),
      });

    if (insertError) {
      console.error("site lead insert failed", {
        message: insertError.message,
      });

      return {
        ok: false,
        error:
          "Не вдалося зберегти заявку. Спробуйте ще раз.",
        successMessage: null,
        fieldErrors: {},
        retryAfterSeconds: null,
      };
    }

    return {
      ok: true,
      error: null,
      successMessage:
        "Дякуємо за заявку. Ми зв’яжемося з вами у робочий час.",
      fieldErrors: {},
      retryAfterSeconds: null,
    };
  } catch (error) {
    console.error("site lead submission failed", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    return {
      ok: false,
      error:
        "Не вдалося надіслати заявку. Спробуйте ще раз.",
      successMessage: null,
      fieldErrors: {},
      retryAfterSeconds: null,
    };
  }
}
