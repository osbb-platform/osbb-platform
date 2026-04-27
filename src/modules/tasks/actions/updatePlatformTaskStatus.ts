"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import type { PlatformTaskStatus } from "@/src/modules/tasks/types/tasks.types";

export type UpdatePlatformTaskStatusResult = {
  error: string | null;
};

function normalizeStatus(value: string): PlatformTaskStatus | null {
  if (
    value === "todo" ||
    value === "in_progress" ||
    value === "review" ||
    value === "done"
  ) {
    return value;
  }

  return null;
}

function getStatusLabel(value: PlatformTaskStatus) {
  if (value === "todo") return "Взяти в роботу";
  if (value === "in_progress") return "В процесі";
  if (value === "review") return "На перевірці";
  return "Виконано";
}

export async function updatePlatformTaskStatus(params: {
  taskId: string;
  nextStatus: string;
}): Promise<UpdatePlatformTaskStatusResult> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return { error: "Не вдалося визначити поточного користувача." };
  }

  const taskId = params.taskId.trim();
  const nextStatus = normalizeStatus(params.nextStatus);

  if (!taskId || !nextStatus) {
    return { error: "Некоректний статус задачі." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: task, error: loadError } = await supabase
    .from("platform_tasks")
    .select("id, title, status, archived_at, deleted_at")
    .eq("id", taskId)
    .maybeSingle();

  if (loadError || !task) {
    return {
      error: `Не вдалося знайти задачу: ${loadError?.message ?? "задачу не знайдено"}`,
    };
  }

  if (task.archived_at || task.deleted_at) {
    return { error: "Архівну або видалену задачу не можна змінювати." };
  }

  const previousStatus = normalizeStatus(String(task.status));

  if (!previousStatus) {
    return { error: "Поточний статус задачі некоректний." };
  }

  if (
    previousStatus === "review" &&
    nextStatus === "done" &&
    currentUser.role !== "admin" &&
    currentUser.role !== "superadmin"
  ) {
    return {
      error: "Тільки admin або superadmin можуть завершити задачу.",
    };
  }

  if (previousStatus === nextStatus) {
    return { error: null };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("platform_tasks")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "done" ? now : null,
      updated_at: now,
    })
    .eq("id", taskId);

  if (updateError) {
    return {
      error: `Не вдалося оновити статус задачі: ${updateError.message}`,
    };
  }

  await supabase.from("platform_task_events").insert({
    task_id: taskId,
    actor_id: currentUser.id,
    event_type: nextStatus === "done" ? "complete" : "status_change",
    action_label:
      nextStatus === "done" ? "Виконання задачі" : "Зміна статусу",
    before_value: getStatusLabel(previousStatus),
    after_value: getStatusLabel(nextStatus),
  });

  if (nextStatus === "done") {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName ?? currentUser.email ?? "Адміністратор",
      actorEmail: currentUser.email ?? null,
      actorRole: currentUser.role ?? null,
      entityType: "task",
      entityId: taskId,
      entityLabel: task.title,
      actionType: "complete_task",
      description: `Задачу «${task.title}» виконано.`,
      metadata: {
        sourceType: "cms",
        sourceModule: "tasks",
        mainSectionKey: "system",
        subSectionKey: "unknown",
        entityType: "task",
      },
    });
  }

  revalidatePath("/admin/tasks");

  return { error: null };
}
