"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { trackVisitorEvent } from "@/src/modules/analytics/ingest/trackVisitorEvent";
import { HOUSE_VISITOR_COOKIE_NAME } from "@/src/modules/analytics/utils/visitorId";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { getClientIpAddress } from "@/src/shared/security/clientIp";
import { RATE_LIMIT_POLICIES } from "@/src/shared/security/rateLimitPolicies";
import {
  clearRateLimit,
  getRateLimitState,
  recordRateLimitFailure,
} from "@/src/shared/security/serverRateLimit";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

type LoginToHouseState = {
  error: string | null;
  lockedUntil?: number | null;
};

function normalizeAccessCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function resolveLockedUntil(
  blockedUntil: number | null,
  retryAfterSeconds: number,
) {
  return blockedUntil
    ?? Date.now() + Math.max(1, retryAfterSeconds) * 1000;
}

export async function loginToHouse(
  _prevState: LoginToHouseState,
  formData: FormData,
): Promise<LoginToHouseState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const rawAccessCode =
    String(formData.get("accessCode") ?? "").trim();
  const accessCode = normalizeAccessCode(rawAccessCode);

  if (!slug || !accessCode) {
    return {
      error: "Введите 6-значный код доступа.",
    };
  }

  if (accessCode.length !== 6) {
    return {
      error: "Код доступа должен содержать 6 цифр.",
    };
  }

  const [cookieStore, headerStore] = await Promise.all([
    cookies(),
    headers(),
  ]);

  const clientIp = getClientIpAddress(headerStore);
  const rateLimitIdentifier =
    `ip=${clientIp}|slug=${slug.toLowerCase()}`;
  const policy = RATE_LIMIT_POLICIES.houseLogin;
  const lockCookieName = `house-access-lock-${slug}`;

  cookieStore.delete(`house-access-attempts-${slug}`);

  const setLockCookie = (lockedUntil: number) => {
    const maxAge = Math.max(
      1,
      Math.ceil((lockedUntil - Date.now()) / 1000),
    );

    cookieStore.set(lockCookieName, String(lockedUntil), {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
  };

  const currentLimit = await getRateLimitState(
    policy,
    rateLimitIdentifier,
  );

  if (!currentLimit.allowed) {
    const lockedUntil = resolveLockedUntil(
      currentLimit.blockedUntil,
      currentLimit.retryAfterSeconds,
    );

    setLockCookie(lockedUntil);

    return {
      error:
        "Для безопасности вход временно приостановлен. Попробуйте немного позже.",
      lockedUntil,
    };
  }

  const supabase = createSupabaseAdminClient();
  const visitorSessionId =
    cookieStore.get(HOUSE_VISITOR_COOKIE_NAME)?.value ?? "";
  const sessionToken = randomUUID();

  const { data: houseForAnalytics } = await supabase
    .from("houses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const analyticsHouseId =
    typeof houseForAnalytics?.id === "string"
      ? houseForAnalytics.id
      : null;

  const { data, error } = await supabase.rpc(
    "create_house_session",
    {
      target_house_slug: slug,
      raw_password: accessCode,
      new_session_token: sessionToken,
      ttl_hours: 12,
    },
  );

  if (error) {
    throw new Error(
      `Failed to create house session: ${error.message}`,
    );
  }

  const result = Array.isArray(data) ? data[0] : null;

  if (!result) {
    const failedLimit = await recordRateLimitFailure(
      policy,
      rateLimitIdentifier,
    );

    if (analyticsHouseId && visitorSessionId) {
      await trackVisitorEvent({
        houseId: analyticsHouseId,
        sessionId: visitorSessionId,
        eventType: "password_fail",
        metadata: {
          source: "house_password_gate",
          houseSlug: slug,
        },
      });
    }

    if (!failedLimit.allowed) {
      const lockedUntil = resolveLockedUntil(
        failedLimit.blockedUntil,
        failedLimit.retryAfterSeconds,
      );

      setLockCookie(lockedUntil);

      return {
        error:
          "Для безопасности вход временно приостановлен на 5 минут.",
        lockedUntil,
      };
    }

    cookieStore.delete(lockCookieName);

    return {
      error: "Код не подошел. Попробуйте еще раз.",
      lockedUntil: null,
    };
  }

  try {
    await clearRateLimit(policy, rateLimitIdentifier);
  } catch {
    console.error(
      "[rate-limit] House login reset failed after successful authentication",
    );
  }

  if (visitorSessionId) {
    await trackVisitorEvent({
      houseId:
        typeof result.house_id === "string"
          ? result.house_id
          : analyticsHouseId ?? "",
      sessionId: visitorSessionId,
      eventType: "password_success",
      metadata: {
        source: "house_password_gate",
        houseSlug: slug,
      },
    });
  }

  await logPlatformChange({
    actorAdminId: null,
    actorName: "Resident",
    actorEmail: null,
    actorRole: "resident",
    entityType: "house_access_session",
    entityId: String(
      result.session_token ?? sessionToken,
    ),
    entityLabel: slug,
    actionType: "house_login",
    description:
      "Житель вошел в личный кабинет дома.",
    houseId:
      typeof result.house_id === "string"
        ? result.house_id
        : null,
    metadata: {
      sourceType: "house_portal",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "access",
      houseId:
        typeof result.house_id === "string"
          ? result.house_id
          : null,
      houseSlug: slug,
      houseName:
        typeof result.house_name === "string"
          ? result.house_name
          : null,
      eventType: "house_login",
    },
  });

  cookieStore.delete(lockCookieName);

  cookieStore.set(
    getHouseAccessCookieName(slug),
    result.session_token,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
    },
  );

  redirect("/");
}
