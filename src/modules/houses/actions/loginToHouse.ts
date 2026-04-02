"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

type LoginToHouseState = {
  error: string | null;
};

const SESSION_TTL_HOURS = 24 * 30;

export async function loginToHouse(
  _prevState: LoginToHouseState,
  formData: FormData,
): Promise<LoginToHouseState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!slug || !password) {
    return {
      error: "Введите пароль дома.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const sessionToken = randomUUID();

  const { data, error } = await supabase.rpc("create_house_session", {
    target_house_slug: slug,
    raw_password: password,
    new_session_token: sessionToken,
    ttl_hours: SESSION_TTL_HOURS,
  });

  if (error) {
    throw new Error(`Failed to create house session: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : null;

  if (!result) {
    return {
      error: "Неверный пароль. Попробуйте еще раз.",
    };
  }

  const expiresAt = new Date(result.expires_at);

  const cookieStore = await cookies();
  cookieStore.set(getHouseAccessCookieName(slug), result.session_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: expiresAt,
  });

  redirect(`/house/${slug}`);
}
