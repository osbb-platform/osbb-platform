"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";

export type UpdateCurrentAdminProfileState = {
  error: string | null;
  success: string | null;
};

export async function updateCurrentAdminProfile(
  _prevState: UpdateCurrentAdminProfileState,
  formData: FormData,
): Promise<UpdateCurrentAdminProfileState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error: "Не удалось определить текущего пользователя.",
      success: null,
    };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const jobTitleRaw = String(formData.get("jobTitle") ?? "").trim();
  const jobTitle = jobTitleRaw || null;

  if (!fullName) {
    return {
      error: "Укажите имя.",
      success: null,
    };
  }

  const supabase = createSupabaseAdminClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
    })
    .eq("id", currentUser.id);

  if (profileError) {
    return {
      error: `Не удалось обновить профиль: ${profileError.message}`,
      success: null,
    };
  }

  const { error: membershipError } = await supabase
    .from("admin_memberships")
    .update({
      full_name_snapshot: fullName,
      job_title: jobTitle,
    })
    .eq("user_id", currentUser.id)
    .is("house_id", null)
    .eq("is_active", true);

  if (membershipError) {
    return {
      error: `Профиль обновлен не полностью: ${membershipError.message}`,
      success: null,
    };
  }

  revalidatePath("/admin/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/employees");

  return {
    error: null,
    success: "Профиль обновлен.",
  };
}
