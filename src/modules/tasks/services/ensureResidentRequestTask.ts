import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureResidentRequestTaskParams = {
  requestId: string;
  houseId: string;
  category: string;
  requesterName: string;
  apartment: string;
};

export async function ensureResidentRequestTask(
  params: EnsureResidentRequestTaskParams,
) {
  const supabase = await createSupabaseServerClient();

  const { data: existingLink } = await supabase
    .from("platform_task_links")
    .select("task_id")
    .eq("link_type", "resident_request")
    .eq("entity_type", "footer_house_message")
    .eq("entity_id", params.requestId)
    .maybeSingle();

  if (existingLink?.task_id) {
    return;
  }

  const { data: task, error } = await supabase
    .from("platform_tasks")
    .insert({
      title: `Звернення мешканця: ${params.category}`,
      description: `${params.requesterName}, квартира ${params.apartment}. Потрібно опрацювати звернення мешканця.`,
      created_by: null,
      assigned_to: null,
      task_type: "resident_request",
      status: "todo",
      priority: "medium",
      is_manual: false,
      metadata: {
        sourceType: "footer_house_message",
        sourceId: params.requestId,
      },
    })
    .select("id")
    .single();

  if (error || !task) {
    throw new Error(
      error?.message ?? "Не вдалося створити задачу звернення мешканця.",
    );
  }

  await supabase.from("platform_task_links").insert({
    task_id: task.id,
    link_type: "resident_request",
    entity_type: "footer_house_message",
    entity_id: params.requestId,
  });

  await supabase.from("platform_task_houses").insert({
    task_id: task.id,
    house_id: params.houseId,
  });

  await supabase.from("platform_task_events").insert({
    task_id: task.id,
    actor_id: null,
    event_type: "create",
    action_label: "Автоматичне створення задачі",
    after_value: "resident_request",
  });
}
