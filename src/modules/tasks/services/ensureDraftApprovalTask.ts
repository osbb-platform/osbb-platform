import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureDraftApprovalTaskParams = {
  houseId: string;
  houseSectionId: string;
  title: string;
  createdBy: string | null;
};

export async function ensureDraftApprovalTask(
  params: EnsureDraftApprovalTaskParams,
) {
  const supabase = await createSupabaseServerClient();

  const { data: existingLink } = await supabase
    .from("platform_task_links")
    .select("task_id, task:platform_tasks(id, deleted_at)")
    .eq("link_type", "draft")
    .eq("entity_type", "house_section")
    .eq("entity_id", params.houseSectionId)
    .maybeSingle();

  const existingTask = Array.isArray(existingLink?.task)
    ? existingLink?.task[0]
    : existingLink?.task;

  if (existingTask && !existingTask.deleted_at) {
    return;
  }

  const { data: task, error } = await supabase
    .from("platform_tasks")
    .insert({
      title: `Підтвердити чернетку: ${params.title}`,
      description: "Чернетка очікує підтвердження адміністратора.",
      created_by: params.createdBy,
      assigned_to: null,
      task_type: "draft_approval",
      status: "todo",
      priority: "high",
      is_manual: false,
      metadata: {
        sourceType: "house_section",
        sourceId: params.houseSectionId,
      },
    })
    .select("id")
    .single();

  if (error || !task) {
    throw new Error(
      error?.message ?? "Не вдалося створити задачу погодження чернетки.",
    );
  }

  await supabase.from("platform_task_links").insert({
    task_id: task.id,
    link_type: "draft",
    entity_type: "house_section",
    entity_id: params.houseSectionId,
  });

  await supabase.from("platform_task_houses").insert({
    task_id: task.id,
    house_id: params.houseId,
  });

  await supabase.from("platform_task_events").insert({
    task_id: task.id,
    actor_id: params.createdBy,
    event_type: "create",
    action_label: "Автоматичне створення задачі",
    after_value: "draft_approval",
  });
}
