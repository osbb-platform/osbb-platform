import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";

export type DuplicateCreatedItem = {
  targetHouseId: string;
  targetHouseName?: string;
  createdId: string;
  lockVersion: number;
};

export function readDuplicateCreatedItem(
  data: unknown,
  targetHouseId: string,
): DuplicateCreatedItem | null {
  if (!data || typeof data !== "object") return null;
  const created = (data as { created?: unknown }).created;
  if (!Array.isArray(created)) return null;
  const item = created.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      (candidate as { targetHouseId?: unknown }).targetHouseId === targetHouseId,
  );
  if (!item || typeof item !== "object") return null;
  const record = item as {
    targetHouseId?: unknown;
    targetHouseName?: unknown;
    createdId?: unknown;
    lockVersion?: unknown;
  };
  if (typeof record.targetHouseId !== "string") return null;
  if (typeof record.createdId !== "string") return null;
  if (typeof record.lockVersion !== "number") return null;
  return {
    targetHouseId: record.targetHouseId,
    targetHouseName:
      typeof record.targetHouseName === "string" ? record.targetHouseName : undefined,
    createdId: record.createdId,
    lockVersion: record.lockVersion,
  };
}

export function buildDuplicatePublishCommand(
  duplicateType: AdminCommand["type"],
  item: DuplicateCreatedItem,
): AdminCommand | null {
  switch (duplicateType) {
    case "announcements.duplicate":
      return { type: "announcements.publish", houseId: item.targetHouseId, payload: { id: item.createdId, lockVersion: item.lockVersion } };
    case "documents.duplicate":
      return { type: "documents.publish", houseId: item.targetHouseId, payload: { id: item.createdId, lockVersion: item.lockVersion } };
    case "information_posts.duplicate":
      return { type: "information_posts.publish", houseId: item.targetHouseId, payload: { data: { id: item.createdId, lockVersion: item.lockVersion } } };
    case "faq.duplicate":
      return { type: "faq.publish", houseId: item.targetHouseId, payload: { faqId: item.createdId, lockVersion: item.lockVersion } };
    case "plan.duplicate":
      return { type: "plan.publish", houseId: item.targetHouseId, payload: { id: item.createdId, lockVersion: item.lockVersion } };
    case "reports.duplicate":
      return { type: "reports.publish", houseId: item.targetHouseId, payload: { id: item.createdId, lockVersion: item.lockVersion } };
    case "specialists.duplicate":
      return { type: "specialists.publish", houseId: item.targetHouseId, payload: { id: item.createdId, lockVersion: item.lockVersion } };
    default:
      return null;
  }
}
