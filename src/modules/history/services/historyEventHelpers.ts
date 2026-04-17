import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import {
  getMainSectionLabel,
  getSubSectionLabel,
  type HistoryMainSectionKey,
  type HistorySubSectionKey,
} from "@/src/modules/history/services/historyLabels";

type CmsHistoryEventParams = {
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actionType: string;
  description: string;
  houseId?: string | null;
  houseSlug?: string | null;
  houseName?: string | null;
  mainSectionKey: HistoryMainSectionKey;
  subSectionKey?: HistorySubSectionKey;
  metadata?: Record<string, unknown>;
};

type HousePortalHistoryEventParams = {
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actionType: string;
  description: string;
  houseId?: string | null;
  houseSlug?: string | null;
  houseName?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  mainSectionKey?: HistoryMainSectionKey;
  subSectionKey?: HistorySubSectionKey;
  metadata?: Record<string, unknown>;
};

export async function logCmsHistoryEvent({
  entityType,
  entityId,
  entityLabel,
  actionType,
  description,
  houseId = null,
  houseSlug = null,
  houseName = null,
  mainSectionKey,
  subSectionKey = "unknown",
  metadata = {},
}: CmsHistoryEventParams) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return;
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType,
    entityId,
    entityLabel,
    actionType,
    description,
    metadata: {
      sourceType: "cms",
      houseId,
      houseSlug,
      houseName,
      mainSectionKey,
      mainSectionLabel: getMainSectionLabel(mainSectionKey),
      subSectionKey,
      subSectionLabel: getSubSectionLabel(subSectionKey),
      ...metadata,
    },
  });
}

export async function logHousePortalHistoryEvent({
  entityType,
  entityId,
  entityLabel,
  actionType,
  description,
  houseId = null,
  houseSlug = null,
  houseName = null,
  actorName = null,
  actorEmail = null,
  actorRole = "resident_request",
  mainSectionKey = "house_portal",
  subSectionKey = "requests",
  metadata = {},
}: HousePortalHistoryEventParams) {
  await logPlatformChange({
    actorAdminId: null,
    actorName,
    actorEmail,
    actorRole,
    entityType,
    entityId,
    entityLabel,
    actionType,
    description,
    metadata: {
      sourceType: "house_portal",
      houseId,
      houseSlug,
      houseName,
      mainSectionKey,
      mainSectionLabel: getMainSectionLabel(mainSectionKey),
      subSectionKey,
      subSectionLabel: getSubSectionLabel(subSectionKey),
      ...metadata,
    },
  });
}
