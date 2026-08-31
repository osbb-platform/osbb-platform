import "server-only";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureDocumentDraftApprovalTaskParams = {
  houseId: string;
  documentId: string;
  title: string;
  createdBy: string | null;
};

export async function ensureDocumentDraftApprovalTask(
  params: EnsureDocumentDraftApprovalTaskParams,
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("create_house_scoped_platform_task", {
    p_house_id: params.houseId,
    p_task_type: "draft_approval",
    p_title: `Підтвердити чернетку: ${params.title}`,
    p_description: "Чернетка документа очікує підтвердження адміністратора.",
    p_priority: "high",
    p_assigned_to: null,
    p_deadline_at: null,
    p_link_type: "draft",
    p_entity_type: "house_document",
    p_entity_id: params.documentId,
    p_created_by: params.createdBy,
    p_is_manual: false,
  });

  if (error) {
    throw new Error(
      error.message ?? "Не вдалося створити задачу погодження документа.",
    );
  }
}
