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
  loadSpecialistCategoryTitlesByHouse,
  publicSpecialistsPaths,
  replaceSpecialistCategoryLinks,
  resolveSpecialistCategoryIds,
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

    // Copy the FULL category set (not just the legacy scalar `category`
    // already copied by buildInsert above) to every created duplicate.
    // Cross-house duplicates must never reuse a category_id from the source
    // house — each target house's own catalog is resolved independently
    // (get-or-create), so the composite-FK tenant-isolation constraint on
    // house_specialist_categories is never at risk of being violated.
    const sourceCategoriesResult = await loadSpecialistCategoryTitlesByHouse(ctx, ctx.house.id);
    if (!sourceCategoriesResult.ok) return sourceCategoriesResult;

    const sourceCategoryTitles = sourceCategoriesResult.data.get(payloadResult.data.sourceId) ?? [];

    if (sourceCategoryTitles.length > 0) {
      for (const created of result.data.created) {
        const categoryIdsResult = await resolveSpecialistCategoryIds(
          ctx,
          created.targetHouseId,
          sourceCategoryTitles,
        );

        if (!categoryIdsResult.ok) return categoryIdsResult;

        const linkResult = await replaceSpecialistCategoryLinks(ctx, {
          houseId: created.targetHouseId,
          specialistId: created.createdId,
          categoryIds: categoryIdsResult.data,
        });

        if (!linkResult.ok) return linkResult;
      }
    }

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
