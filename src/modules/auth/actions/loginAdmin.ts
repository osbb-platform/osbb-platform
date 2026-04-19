"use server";

import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";

type LoginAdminState = {
  error: string | null;
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

  redirect("/admin");
}
