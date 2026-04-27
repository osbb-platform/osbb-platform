"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";

export async function deletePlatformTask(taskId: string) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error: "Не вдалося визначити поточного користувача.",
    };
  }

  if (
    currentUser.role !== "admin" &&
    currentUser.role !== "superadmin"
  ) {
    return {
      error: "Видаляти задачі можуть тільки admin або superadmin.",
    };
  }

  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return {
      error: "Не передано ID задачі.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("platform_tasks")
    .update({
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", normalizedTaskId);

  if (error) {
    return {
      error: `Не вдалося видалити задачу: ${error.message}`,
    };
  }

  await supabase.from("platform_task_events").insert({
    task_id: normalizedTaskId,
    actor_id: currentUser.id,
    event_type: "delete",
    action_label: "Видалення задачі",
    after_value: "deleted",
  });

  revalidatePath("/admin/tasks");

  return {
    error: null,
  };
}
