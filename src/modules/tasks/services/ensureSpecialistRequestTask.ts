import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

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
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("create_house_scoped_platform_task", {
    p_house_id: params.houseId,
    p_task_type: "specialist_request",
    p_title: `Заявка до спеціаліста: ${params.specialistLabel}`,
    p_description: `${params.requesterName}, квартира ${params.apartment}. Потрібен зворотний зв’язок зі спеціалістом.`,
    p_priority: "medium",
    p_assigned_to: null,
    p_deadline_at: null,
    p_link_type: "specialist_request",
    p_entity_type: "specialist_contact_request",
    p_entity_id: params.requestId,
    p_created_by: null,
    p_is_manual: false,
  });

  if (error) {
    throw new Error(
      error.message ?? "Не вдалося створити задачу заявки до спеціаліста.",
    );
  }
}
