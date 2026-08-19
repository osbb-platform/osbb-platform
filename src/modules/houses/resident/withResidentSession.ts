import "server-only";

import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";
import { getClientIp } from "@/src/shared/security/clientIp";
import { consumeServerRateLimit } from "@/src/shared/security/serverRateLimit";
import type { ServerRateLimitPolicy } from "@/src/shared/security/rateLimitPolicies";

export type ResidentSessionContext = {
  houseId: string;
  slug: string;
  sessionToken: string;
};

export type ResidentSessionErrorCode =
  | "INVALID_SLUG"
  | "ORIGIN_REJECTED"
  | "SESSION_REQUIRED"
  | "HOUSE_NOT_FOUND"
  | "RATE_LIMITED";

export class ResidentSessionError extends Error {
  readonly code: ResidentSessionErrorCode;
  readonly retryAfterSeconds: number | null;

  constructor(
    code: ResidentSessionErrorCode,
    message: string,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "ResidentSessionError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

async function assertSameOrigin() {
  const headerStore = await headers();

  const origin = headerStore.get("origin")?.trim();
  const forwardedHost = headerStore
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || headerStore.get("host")?.trim();

  if (!origin || !host) {
    throw new ResidentSessionError(
      "ORIGIN_REJECTED",
      "Не вдалося підтвердити джерело запиту.",
    );
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ResidentSessionError(
      "ORIGIN_REJECTED",
      "Не вдалося підтвердити джерело запиту.",
    );
  }

  if (originHost.toLowerCase() !== host.toLowerCase()) {
    throw new ResidentSessionError(
      "ORIGIN_REJECTED",
      "Запит з іншого джерела відхилено.",
    );
  }
}

export async function withResidentSession<T>(
  params: {
    slug: string;
    rateLimitPolicy?: ServerRateLimitPolicy;
  },
  operation: (
    context: ResidentSessionContext,
  ) => Promise<T>,
): Promise<T> {
  const slug = normalizeSlug(params.slug);

  if (!slug) {
    throw new ResidentSessionError(
      "INVALID_SLUG",
      "Будинок не визначено.",
    );
  }

  await assertSameOrigin();

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(getHouseAccessCookieName(slug))?.value?.trim() ?? "";

  if (!sessionToken) {
    throw new ResidentSessionError(
      "SESSION_REQUIRED",
      "Сесію доступу до будинку не підтверджено.",
    );
  }

  const hasAccess = await validateHouseSession({
    slug,
    sessionToken,
  });

  if (!hasAccess) {
    throw new ResidentSessionError(
      "SESSION_REQUIRED",
      "Сесію доступу до будинку не підтверджено.",
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: house, error: houseError } = await supabase
    .from("houses")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (
    houseError ||
    !house ||
    typeof house.id !== "string"
  ) {
    console.error("Resident session house lookup failed", {
      slug,
      message: houseError?.message ?? null,
    });

    throw new ResidentSessionError(
      "HOUSE_NOT_FOUND",
      "Будинок не знайдено.",
    );
  }

  if (params.rateLimitPolicy) {
    const clientIp = await getClientIp();

    const rateLimit = await consumeServerRateLimit({
      policy: params.rateLimitPolicy,
      subject: [
        params.rateLimitPolicy.scope,
        slug,
        clientIp,
        sessionToken,
      ].join(":"),
    });

    if (!rateLimit.allowed) {
      throw new ResidentSessionError(
        "RATE_LIMITED",
        "Забагато запитів. Спробуйте трохи пізніше.",
        rateLimit.retryAfterSeconds,
      );
    }
  }

  return operation({
    houseId: house.id,
    slug,
    sessionToken,
  });
}
