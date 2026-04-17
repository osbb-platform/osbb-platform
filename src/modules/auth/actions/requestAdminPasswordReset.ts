"use server";

import { headers } from "next/headers";
import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

export type RequestAdminPasswordResetState = {
  error: string | null;
  success: string | null;
};

function buildResetRedirectUrl(origin: string) {
  return `${origin}${ROUTES.admin.resetPassword}`;
}

async function resolveAppOrigin() {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");

  const protocol =
    forwardedProto && forwardedProto.length > 0
      ? forwardedProto
      : process.env.NODE_ENV === "development"
        ? "http"
        : "https";

  const resolvedHost = forwardedHost || host || "localhost:3000";

  return `${protocol}://${resolvedHost}`;
}

export async function requestAdminPasswordReset(
  _prevState: RequestAdminPasswordResetState,
  formData: FormData,
): Promise<RequestAdminPasswordResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return {
      error: "Введите email сотрудника.",
      success: null,
    };
  }

  const supabase = await createSupabaseActionClient();
  const origin = await resolveAppOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildResetRedirectUrl(origin),
  });

  if (error) {
    return {
      error: "Не удалось отправить письмо для смены пароля.",
      success: null,
    };
  }

  return {
    error: null,
    success:
      "Мы отправили письмо со ссылкой для смены пароля. Проверьте почту.",
  };
}
