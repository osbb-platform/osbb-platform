"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import type {
  PlatformTaskPriority,
  PlatformTaskStatus,
} from "@/src/modules/tasks/types/tasks.types";

export type UpdatePlatformTaskState = {
  error: string | null;
  success: string | null;
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

function normalizePriority(value: string): PlatformTaskPriority {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return null;
}

function normalizeDeadline(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function updatePlatformTask(
  _prevState: UpdatePlatformTaskState,
  formData: FormData,
): Promise<UpdatePlatformTaskState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error: "Не вдалося визначити поточного користувача.",
      success: null,
    };
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedTo = String(formData.get("assignedTo") ?? "").trim() || null;
  const houseId = String(formData.get("houseId") ?? "").trim() || null;
  const status = normalizeStatus(String(formData.get("status") ?? "").trim());
  const priority = normalizePriority(String(formData.get("priority") ?? "").trim());
  const deadlineAt = normalizeDeadline(String(formData.get("deadlineAt") ?? "").trim());

  if (!taskId) {
    return {
      error: "Не передано ID задачі.",
      success: null,
    };
  }

  if (!status) {
    return {
      error: "Некоректний статус задачі.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: task, error: loadError } = await supabase
    .from("platform_tasks")
    .select("id, title, description, status, task_type, priority, deadline_at, assigned_to, archived_at, deleted_at")
    .eq("id", taskId)
    .maybeSingle();

  if (loadError || !task) {
    return {
      error: `Не вдалося знайти задачу: ${loadError?.message ?? "задачу не знайдено"}`,
      success: null,
    };
  }

  if (task.archived_at || task.deleted_at) {
    return {
      error: "Архівну або видалену задачу не можна редагувати.",
      success: null,
    };
  }

  const isManualTask = task.task_type === "manual";
  const nextTitle = isManualTask ? title : task.title;

  if (isManualTask && !nextTitle.trim()) {
    return {
      error: "Вкажіть назву задачі.",
      success: null,
    };
  }

  if (
    task.status === "review" &&
    status === "done" &&
    currentUser.role !== "admin" &&
    currentUser.role !== "superadmin"
  ) {
    return {
      error: "Тільки admin або superadmin можуть завершити задачу.",
      success: null,
    };
  }

  const now = new Date().toISOString();

  const changes: string[] = [];

  if (task.title !== nextTitle) changes.push("назву");
  if ((task.description ?? "") !== description) changes.push("опис");
  if (task.status !== status) changes.push("статус");
  if ((task.assigned_to ?? null) !== assignedTo) changes.push("виконавця");
  if ((task.priority ?? null) !== priority) changes.push("пріоритет");
  if ((task.deadline_at ?? null) !== deadlineAt) changes.push("дедлайн");

  const { error: updateError } = await supabase
    .from("platform_tasks")
    .update({
      title: nextTitle,
      description: description || null,
      status,
      assigned_to: assignedTo,
      priority,
      deadline_at: deadlineAt,
      completed_at: status === "done" ? now : null,
      updated_at: now,
    })
    .eq("id", taskId);

  if (updateError) {
    return {
      error: `Не вдалося оновити задачу: ${updateError.message}`,
      success: null,
    };
  }

  if (isManualTask) {
    await supabase
      .from("platform_task_houses")
      .delete()
      .eq("task_id", taskId);

    if (houseId) {
      await supabase.from("platform_task_houses").insert({
        task_id: taskId,
        house_id: houseId,
      });
    }
  }

  if (changes.length > 0) {
    await supabase.from("platform_task_events").insert({
      task_id: taskId,
      actor_id: currentUser.id,
      event_type: "update",
      action_label: `Оновлення задачі: ${changes.join(", ")}`,
      before_value: null,
      after_value: null,
    });
  }

  revalidatePath("/admin/tasks");

  return {
    error: null,
    success: "Задачу оновлено.",
  };
}
