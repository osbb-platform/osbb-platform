"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";
import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { getClientIpAddress } from "@/src/shared/security/clientIp";
import { RATE_LIMIT_POLICIES } from "@/src/shared/security/rateLimitPolicies";
import {
  clearRateLimit,
  getRateLimitState,
  recordRateLimitFailure,
} from "@/src/shared/security/serverRateLimit";

type LoginAdminState = {
  error: string | null;
  lockedUntil?: number | null;
};

function resolveLockedUntil(
  blockedUntil: number | null,
  retryAfterSeconds: number,
) {
  return blockedUntil
    ?? Date.now() + Math.max(1, retryAfterSeconds) * 1000;
}

export async function loginAdmin(
  _prevState: LoginAdminState,
  formData: FormData,
): Promise<LoginAdminState> {
  const email =
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

  const password =
    String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      error:
        "Введіть електронну пошту та пароль.",
    };
  }

  const headerStore = await headers();
  const clientIp = getClientIpAddress(headerStore);
  const rateLimitIdentifier =
    `ip=${clientIp}|email=${email}`;
  const policy = RATE_LIMIT_POLICIES.adminLogin;

  const currentLimit = await getRateLimitState(
    policy,
    rateLimitIdentifier,
  );

  if (!currentLimit.allowed) {
    return {
      error:
        "Забагато невдалих спроб. Спробуйте ще раз пізніше.",
      lockedUntil: resolveLockedUntil(
        currentLimit.blockedUntil,
        currentLimit.retryAfterSeconds,
      ),
    };
  }

  const supabase = await createSupabaseActionClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    const failedLimit =
      await recordRateLimitFailure(
        policy,
        rateLimitIdentifier,
      );

    if (!failedLimit.allowed) {
      return {
        error:
          "Забагато невдалих спроб. Вхід тимчасово заблоковано.",
        lockedUntil: resolveLockedUntil(
          failedLimit.blockedUntil,
          failedLimit.retryAfterSeconds,
        ),
      };
    }

    return {
      error: "Неправильна пошта або пароль.",
      lockedUntil: null,
    };
  }

  try {
    await clearRateLimit(
      policy,
      rateLimitIdentifier,
    );
  } catch {
    console.error(
      "[rate-limit] Admin login reset failed after successful authentication",
    );
  }

  redirect(ROUTES.admin.dashboard);
}
