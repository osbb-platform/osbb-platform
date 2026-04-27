import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureSpecialistRequestTaskParams = {
  requestId: string;
  houseId: string;
  specialistLabel: string;
  requesterName: string;
  apartment: string;
};

export async function ensureSpecialistRequestTask(
  params: EnsureSpecialistRequestTaskParams,
) {
  const supabase = await createSupabaseServerClient();

  const { data: existingLink } = await supabase
    .from("platform_task_links")
    .select("task_id")
    .eq("link_type", "request")
    .eq("entity_type", "specialist_contact_request")
    .eq("entity_id", params.requestId)
    .maybeSingle();

  if (existingLink?.task_id) {
    return;
  }

  const title = `Заявка до спеціаліста: ${params.specialistLabel}`;

  const { data: task, error } = await supabase
    .from("platform_tasks")
    .insert({
      title,
      description:
        `${params.requesterName}, квартира ${params.apartment}. Потрібен зворотний зв’язок зі спеціалістом.`,
      created_by: null,
      assigned_to: null,
      task_type: "specialist_request",
      status: "todo",
      priority: "medium",
      is_manual: false,
      metadata: {
        sourceType: "specialist_contact_request",
        sourceId: params.requestId,
      },
    })
    .select("id")
    .single();

  if (error || !task) {
    throw new Error(
      error?.message ?? "Не вдалося створити задачу заявки до спеціаліста.",
    );
  }

  await supabase.from("platform_task_links").insert({
    task_id: task.id,
    link_type: "request",
    entity_type: "specialist_contact_request",
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
    after_value: "specialist_request",
  });
}
