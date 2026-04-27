"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";

export async function archivePlatformTask(taskId: string) {
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
    .select("id, title, archived_at, deleted_at")
    .eq("id", normalizedTaskId)
    .maybeSingle();

  if (loadError || !task) {
    return {
      error: `Не вдалося знайти задачу: ${loadError?.message ?? "задачу не знайдено"}`,
    };
  }

  if (task.deleted_at) {
    return {
      error: "Видалену задачу не можна архівувати.",
    };
  }

  if (task.archived_at) {
    return {
      error: null,
    };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("platform_tasks")
    .update({
      archived_at: now,
      updated_at: now,
    })
    .eq("id", normalizedTaskId);

  if (updateError) {
    return {
      error: `Не вдалося архівувати задачу: ${updateError.message}`,
    };
  }

  await supabase.from("platform_task_events").insert({
    task_id: normalizedTaskId,
    actor_id: currentUser.id,
    event_type: "archive",
    action_label: "Архівація задачі",
    after_value: "archived",
  });

  revalidatePath("/admin/tasks");

  return {
    error: null,
  };
}
