import type { CommandSpec } from "../../../types/handler";
import {
  duplicateTableRecordToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { ok } from "../../../types/result";
import type { HouseReport } from "../types";
import {
  HOUSE_REPORT_ENTITY_TYPE,
  publicReportPaths,
  reportHistoryMetadata,
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

    const result = await duplicateTableRecordToDraft<HouseReport>({
      ctx,
      sourceTable: "house_reports",
      entityType: HOUSE_REPORT_ENTITY_TYPE,
      sourceId: payloadResult.data.sourceId,
      targetHouseIds: payloadResult.data.targetHouseIds,
      sourceTitle: (source) => source.title,
      buildInsert: ({ source, targetHouse, newId, actor, now }) => ({
        id: newId,
        house_id: targetHouse.id,
        title: source.title,
        description: source.description,
        category_id: source.category_id,
        category_title: source.category_title,
        report_date: source.report_date,
        period_type: source.period_type,
        month: source.month,
        year: source.year,
        is_pinned: source.is_pinned,
        is_new: source.is_new,
        new_until: source.new_until,
        lifecycle_status: "draft",
        sort_order: source.sort_order,
        published_at: null,
        archived_at: null,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      }),
      targetDescription: ({ source }) =>
        `Створено чернетку звіту «${source.title}» з дублювання.`,
      historyMetadata: reportHistoryMetadata(),
      publicPathsForHouse: publicReportPaths,
    });

    if (!result.ok) return result;

    return ok({
      data: result.data,
      history: {
        entityType: HOUSE_REPORT_ENTITY_TYPE,
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `Звіт «${result.data.source.title}» дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: reportHistoryMetadata({
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        }),
      },
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
