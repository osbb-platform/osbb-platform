import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";

type CommandResultRecord = {
  id?: unknown;
  lock_version?: unknown;
};

function readFreshIdentity(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as CommandResultRecord;
  if (typeof record.id !== "string") return null;
  if (typeof record.lock_version !== "number") return null;

  return { id: record.id, lockVersion: record.lock_version };
}

export function buildLifecycleUndoCommand(
  command: AdminCommand,
  data: unknown,
): AdminCommand | null {
  const identity = readFreshIdentity(data);
  if (!identity) return null;

  const { id, lockVersion } = identity;

  switch (command.type) {
    case "announcements.publish":
      return { type: "announcements.archive", houseId: command.houseId, payload: { id, lockVersion } };
    case "announcements.archive":
      return { type: "announcements.restore", houseId: command.houseId, payload: { id, lockVersion } };
    case "documents.publish":
      return { type: "documents.archive", houseId: command.houseId, payload: { id, lockVersion } };
    case "documents.archive":
      return { type: "documents.restore", houseId: command.houseId, payload: { id, lockVersion } };
    case "information_posts.publish":
      return { type: "information_posts.archive", houseId: command.houseId, payload: { data: { id, lockVersion } } };
    case "information_posts.archive":
      return { type: "information_posts.restore", houseId: command.houseId, payload: { data: { id, lockVersion } } };
    case "faq.publish":
      return { type: "faq.archive", houseId: command.houseId, payload: { faqId: id, lockVersion } };
    case "faq.archive":
      return { type: "faq.restore", houseId: command.houseId, payload: { faqId: id, lockVersion } };
    case "meetings.publish":
      return { type: "meetings.archive", houseId: command.houseId, payload: { id, lockVersion } };
    case "meetings.archive":
      return { type: "meetings.restore", houseId: command.houseId, payload: { id, lockVersion } };
    case "plan.publish":
      return { type: "plan.archive", houseId: command.houseId, payload: { id, lockVersion } };
    case "plan.archive":
      return { type: "plan.restore", houseId: command.houseId, payload: { id, lockVersion } };
    case "reports.publish":
      return { type: "reports.archive", houseId: command.houseId, payload: { id, lockVersion } };
    case "reports.archive":
      return { type: "reports.restore", houseId: command.houseId, payload: { id, lockVersion } };
    case "specialists.publish":
      return { type: "specialists.archive", houseId: command.houseId, payload: { id, lockVersion } };
    case "specialists.archive":
      return { type: "specialists.restore", houseId: command.houseId, payload: { id, lockVersion } };
    default:
      return null;
  }
}
