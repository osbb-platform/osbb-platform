"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";

export type AddPlatformTaskCommentState = {
  error: string | null;
  success: string | null;
};

export async function addPlatformTaskComment(
  _prevState: AddPlatformTaskCommentState,
  formData: FormData,
): Promise<AddPlatformTaskCommentState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error: "Не вдалося визначити поточного користувача.",
      success: null,
    };
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!taskId) {
    return {
      error: "Не передано задачу.",
      success: null,
    };
  }

  if (!content) {
    return {
      error: "Введіть текст коментаря.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: task, error: taskError } = await supabase
    .from("platform_tasks")
    .select("id, deleted_at")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    return {
      error: `Не вдалося знайти задачу: ${taskError?.message ?? "задачу не знайдено"}`,
      success: null,
    };
  }

  if (task.deleted_at) {
    return {
      error: "До видаленої задачі не можна додавати коментарі.",
      success: null,
    };
  }

  const { error: commentError } = await supabase
    .from("platform_task_comments")
    .insert({
      task_id: taskId,
      author_id: currentUser.id,
      content,
    });

  if (commentError) {
    return {
      error: `Не вдалося додати коментар: ${commentError.message}`,
      success: null,
    };
  }

  await supabase.from("platform_task_events").insert({
    task_id: taskId,
    actor_id: currentUser.id,
    event_type: "comment",
    action_label: "Коментар",
    after_value: content,
  });

  revalidatePath("/admin/tasks");

  return {
    error: null,
    success: "Коментар додано.",
  };
}
