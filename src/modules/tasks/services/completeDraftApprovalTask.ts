import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function completeDraftApprovalTask(
  sourceId: string,
  actorId: string | null,
) {
  const supabase = await createSupabaseServerClient();

  const { data: link } = await supabase
    .from("platform_task_links")
    .select("task_id")
    .eq("link_type", "draft")
    .eq("entity_type", "house_section")
    .eq("entity_id", sourceId)
    .maybeSingle();

  if (!link?.task_id) {
    return;
  }

  const { data: task } = await supabase
    .from("platform_tasks")
    .select("id, status, deleted_at")
    .eq("id", link.task_id)
    .maybeSingle();

  if (!task || task.deleted_at) {
    return;
  }

  if (task.status !== "done") {
    await supabase
      .from("platform_tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    await supabase.from("platform_task_events").insert({
      task_id: task.id,
      actor_id: actorId,
      event_type: "complete",
      action_label: "Автоматичне завершення задачі",
      before_value: task.status,
      after_value: "done",
    });
  }
}
