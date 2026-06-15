import type { CommandSpec } from "../../../types/handler";
import {
  duplicateTableRecordToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { ok } from "../../../types/result";
import type { HouseSpecialist } from "../types";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  publicSpecialistsPaths,
  specialistHistoryMetadata,
  specialistTaskTitle,
} from "./shared";

export const duplicateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    return validateDuplicatePayload(rawPayload);
  },

  async execute(rawPayload, ctx) {
    const payloadResult = parseDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const result = await duplicateTableRecordToDraft<HouseSpecialist>({
      ctx,
      sourceTable: "house_specialists",
      entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
      sourceId: payloadResult.data.sourceId,
      targetHouseIds: payloadResult.data.targetHouseIds,
      sourceTitle: specialistTaskTitle,
      buildInsert: ({ source, targetHouse, newId, now }) => ({
        id: newId,
        house_id: targetHouse.id,
        title: source.title,
        category: source.category,
        phones: source.phones,
        phone_types: source.phone_types ?? [],
        email: source.email,
        description: source.description,
        sort_order: source.sort_order,
        lifecycle_status: "draft",
        lock_version: 1,
        published_at: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      }),
      targetDescription: ({ source }) =>
        `Створено чернетку спеціаліста «${specialistTaskTitle(source)}» з дублювання.`,
      historyMetadata: specialistHistoryMetadata(),
      publicPathsForHouse: publicSpecialistsPaths,
    });

    if (!result.ok) return result;

    return ok({
      data: result.data,
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `Спеціаліста «${specialistTaskTitle(result.data.source)}» дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: specialistHistoryMetadata({
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        }),
      },
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
