"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

type LoginToHouseState = {
  error: string | null;
  lockedUntil?: number | null;
};

function normalizeAccessCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export async function loginToHouse(
  _prevState: LoginToHouseState,
  formData: FormData,
): Promise<LoginToHouseState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const rawAccessCode = String(formData.get("accessCode") ?? "").trim();
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

  const cookieStore = await cookies();
  const attemptsCookieName = `house-access-attempts-${slug}`;
  const lockCookieName = `house-access-lock-${slug}`;

  const lockedUntil = Number(cookieStore.get(lockCookieName)?.value ?? 0);

  if (lockedUntil && lockedUntil > Date.now()) {
    return {
      error: "Для безопасности вход временно приостановлен. Попробуйте немного позже.",
      lockedUntil,
    };
  }


  const supabase = await createSupabaseServerClient();
  const sessionToken = randomUUID();

  const { data, error } = await supabase.rpc("create_house_session", {
    target_house_slug: slug,
    raw_password: accessCode,
    new_session_token: sessionToken,
    ttl_hours: 12,
  });

  if (error) {
    throw new Error(`Failed to create house session: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : null;

  if (!result) {
    const currentAttempts = Number(
      cookieStore.get(attemptsCookieName)?.value ?? "0",
    );
    const nextAttempts = currentAttempts + 1;

    if (nextAttempts >= 3) {
      const nextLockedUntil = Date.now() + 5 * 60 * 1000;

      cookieStore.set(lockCookieName, String(nextLockedUntil), {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 5 * 60,
      });

      cookieStore.delete(attemptsCookieName);

      return {
        error:
          "Для безопасности вход временно приостановлен на 5 минут.",
        lockedUntil: nextLockedUntil,
      };
    }

    cookieStore.set(attemptsCookieName, String(nextAttempts), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 5 * 60,
    });

    return {
      error: "Код не подошел. Попробуйте еще раз.",
      lockedUntil: null,
    };
  }

  await logPlatformChange({
    actorAdminId: null,
    actorName: "Resident",
    actorEmail: null,
    actorRole: "resident",
    entityType: "house_access_session",
    entityId: String(result.session_token ?? sessionToken),
    entityLabel: slug,
    actionType: "house_login",
    description: "Житель вошел в личный кабинет дома.",
    houseId: typeof result.house_id === "string" ? result.house_id : null,
    metadata: {
      sourceType: "house_portal",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "access",
      houseId: typeof result.house_id === "string" ? result.house_id : null,
      houseSlug: slug,
      houseName: typeof result.house_name === "string" ? result.house_name : null,
      eventType: "house_login",
    },
  });


  cookieStore.delete(attemptsCookieName);
  cookieStore.delete(lockCookieName);

  cookieStore.set(getHouseAccessCookieName(slug), result.session_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  redirect(`/house/${slug}`);
}
