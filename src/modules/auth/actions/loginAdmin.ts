"use server";

import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";

type LoginAdminState = {
  error: string | null;
  ok?: boolean;
};

export async function loginAdmin(
  _prevState: LoginAdminState,
  formData: FormData,
): Promise<LoginAdminState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      error: "Введіть електронну пошту та пароль.",
    };
  }

  const supabase = await createSupabaseActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Неправильна пошта або пароль.",
    };
  }

  // RC-3: a Next.js redirect() here performs a client-router *soft*
  // transition. That transition was intermittently resolving the target
  // path against the wrong (marketing) route tree on the very first
  // post-login paint, on both dev and production builds — a plain reload of
  // the same URL immediately afterwards always rendered the correct admin
  // destination. Returning success and letting the client do a real
  // (hard) navigation avoids the soft-transition race entirely.
  return { error: null, ok: true };
}
