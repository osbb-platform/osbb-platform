import type { CommandSpec } from "../../../types/handler";
import {
  duplicateTableRecordToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { ok } from "../../../types/result";
import type { Announcement } from "../types";

export const duplicateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    return validateDuplicatePayload(rawPayload);
  },

  async execute(rawPayload, ctx) {
    const payloadResult = parseDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const result = await duplicateTableRecordToDraft<Announcement>({
      ctx,
      sourceTable: "house_announcements",
      entityType: "house_announcement",
      sourceId: payloadResult.data.sourceId,
      targetHouseIds: payloadResult.data.targetHouseIds,
      sourceTitle: (source) => source.title,
      buildInsert: ({ source, targetHouse, newId, actor }) => ({
        id: newId,
        house_id: targetHouse.id,
        title: source.title,
        body: source.body,
        level: source.level,
        lifecycle_status: "draft",
        published_at: null,
        archived_at: null,
        created_by: actor.id,
      }),
      targetDescription: ({ source }) =>
        `Створено чернетку оголошення «${source.title}» з дублювання.`,
      historyMetadata: { subSectionKey: "announcements" },
      publicPathsForHouse: (houseSlug) => [
        `/house/${houseSlug}`,
        `/house/${houseSlug}/announcements`,
      ],
    });

    if (!result.ok) return result;

    return ok({
      data: result.data,
      history: {
        entityType: "house_announcement",
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `Оголошення «${result.data.source.title}» дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: {
          subSectionKey: "announcements",
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        },
      },
    });
  },
};
