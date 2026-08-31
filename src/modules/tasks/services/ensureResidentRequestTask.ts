import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

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
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("create_house_scoped_platform_task", {
    p_house_id: params.houseId,
    p_task_type: "resident_request",
    p_title: `Звернення мешканця: ${params.category}`,
    p_description: `${params.requesterName}, квартира ${params.apartment}. Потрібно опрацювати звернення мешканця.`,
    p_priority: "medium",
    p_assigned_to: null,
    p_deadline_at: null,
    p_link_type: "resident_request",
    p_entity_type: "footer_house_message",
    p_entity_id: params.requestId,
    p_created_by: null,
    p_is_manual: false,
  });

  if (error) {
    throw new Error(
      error.message ?? "Не вдалося створити задачу звернення мешканця.",
    );
  }
}
