import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import {
  getMainSectionLabel,
  getSubSectionLabel,
  inferMainSectionKey,
  inferSubSectionKey,
} from "@/src/modules/history/services/historyLabels";

type LogPlatformChangeParams = {
  actorAdminId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  houseId?: string | null;
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
};

function normalizeMetadata(params: {
  metadata: Record<string, unknown>;
  entityType: string;
  actionType: string;
  actorRole: string | null;
}) {
  const { metadata, entityType, actionType, actorRole } = params;

  const sourceType =
    typeof metadata.sourceType === "string"
      ? metadata.sourceType
      : actorRole === "resident_request"
        ? "house_portal"
        : "cms";

  const mainSectionKey =
    typeof metadata.mainSectionKey === "string"
      ? metadata.mainSectionKey
      : inferMainSectionKey({
          entityType,
          sourceType,
        });

  const subSectionKey =
    typeof metadata.subSectionKey === "string"
      ? metadata.subSectionKey
      : inferSubSectionKey({
          entityType,
          actionType,
          metadata,
        });

  return {
    sourceType,
    mainSectionKey,
    mainSectionLabel:
      typeof metadata.mainSectionLabel === "string"
        ? metadata.mainSectionLabel
        : getMainSectionLabel(mainSectionKey),
    subSectionKey,
    subSectionLabel:
      typeof metadata.subSectionLabel === "string"
        ? metadata.subSectionLabel
        : getSubSectionLabel(subSectionKey),
    ...metadata,
  };
}

export async function logPlatformChange({
  actorAdminId,
  actorName,
  actorEmail,
  actorRole,
  entityType,
  entityId,
  entityLabel,
  houseId,
  actionType,
  description,
  metadata = {},
}: LogPlatformChangeParams) {
  try {
    const supabase = await createSupabaseServerClient();

    const normalizedMetadata = normalizeMetadata({
      metadata: houseId ? { houseId, ...metadata } : metadata,
      entityType,
      actionType,
      actorRole,
    });

    const { error } = await supabase.from("platform_change_history").insert({
      actor_admin_id: actorAdminId,
      actor_name: actorName,
      actor_email: actorEmail,
      actor_role: actorRole,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      action_type: actionType,
      description,
      metadata: normalizedMetadata,
    });

    if (error) {
      console.error("Failed to write platform change history:", error.message);
    }
  } catch (error) {
    console.error("Failed to log platform change:", error);
  }
}
