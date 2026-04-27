"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type CreatePlatformTaskState = {
  error: string | null;
  success: string | null;
};

function normalizePriority(value: string) {
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

export async function createPlatformTask(
  _prevState: CreatePlatformTaskState,
  formData: FormData,
): Promise<CreatePlatformTaskState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error: "Не вдалося визначити поточного користувача.",
      success: null,
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedTo = String(formData.get("assignedTo") ?? "").trim() || null;
  const houseId = String(formData.get("houseId") ?? "").trim() || null;
  const priority = normalizePriority(
    String(formData.get("priority") ?? "").trim(),
  );
  const deadlineAt = normalizeDeadline(
    String(formData.get("deadlineAt") ?? "").trim(),
  );

  if (!title) {
    return {
      error: "Вкажіть назву задачі.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: createdTask, error } = await supabase
    .from("platform_tasks")
    .insert({
      title,
      description: description || null,
      created_by: currentUser.id,
      assigned_to: assignedTo,
      task_type: "manual",
      status: "todo",
      priority,
      deadline_at: deadlineAt,
      is_manual: true,
    })
    .select("id, title")
    .single();

  if (error || !createdTask) {
    return {
      error: `Не вдалося створити задачу: ${error?.message ?? "Unknown error"}`,
      success: null,
    };
  }

  await supabase.from("platform_task_events").insert({
    task_id: createdTask.id,
    actor_id: currentUser.id,
    event_type: "create",
    action_label: "Створення задачі",
    after_value: "todo",
  });


  if (houseId) {
    await supabase.from("platform_task_houses").insert({
      task_id: createdTask.id,
      house_id: houseId,
    });
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName ?? currentUser.email ?? "Адміністратор",
    actorEmail: currentUser.email ?? null,
    actorRole: currentUser.role ?? null,
    entityType: "task",
    entityId: createdTask.id,
    entityLabel: createdTask.title,
    actionType: "create_task",
    description: `Створено задачу «${createdTask.title}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "tasks",
      mainSectionKey: "system",
      subSectionKey: "unknown",
      entityType: "task",
    },
  });

  revalidatePath("/admin/tasks");

  return {
    error: null,
    success: `Задачу «${createdTask.title}» створено.`,
  };
}
