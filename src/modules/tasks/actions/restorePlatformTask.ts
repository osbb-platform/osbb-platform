"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";

export async function restorePlatformTask(taskId: string) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error: "Не вдалося визначити поточного користувача.",
    };
  }

  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return {
      error: "Не передано ID задачі.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: task, error: loadError } = await supabase
    .from("platform_tasks")
    .select("id, archived_at, deleted_at, status")
    .eq("id", normalizedTaskId)
    .maybeSingle();

  if (loadError || !task) {
    return {
      error: `Не вдалося знайти задачу: ${loadError?.message ?? "задачу не знайдено"}`,
    };
  }

  if (task.deleted_at) {
    return {
      error: "Видалену задачу не можна відновити.",
    };
  }

  if (!task.archived_at) {
    return {
      error: null,
    };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("platform_tasks")
    .update({
      archived_at: null,
      updated_at: now,
      status: task.status === "done" ? "review" : task.status,
    })
    .eq("id", normalizedTaskId);

  if (updateError) {
    return {
      error: `Не вдалося відновити задачу: ${updateError.message}`,
    };
  }

  await supabase.from("platform_task_events").insert({
    task_id: normalizedTaskId,
    actor_id: currentUser.id,
    event_type: "restore",
    action_label: "Відновлення задачі",
    after_value: "restored",
  });

  revalidatePath("/admin/tasks");

  return {
    error: null,
  };
}
