import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function deleteDraftApprovalTask(
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

  await supabase
    .from("platform_tasks")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.task_id);

  await supabase.from("platform_task_events").insert({
    task_id: link.task_id,
    actor_id: actorId,
    event_type: "delete",
    action_label: "Автоматичне видалення задачі",
    after_value: "deleted",
  });
}
