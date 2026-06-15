import type { CommandSpec } from "../../../types/handler";
import {
  duplicateTableRecordToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { ok } from "../../../types/result";
import type { HousePlanTask } from "../types";
import {
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  planHistoryMetadata,
  planTaskTitle,
  publicPlanPaths,
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

    const result = await duplicateTableRecordToDraft<HousePlanTask>({
      ctx,
      sourceTable: "house_plan_tasks",
      entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
      sourceId: payloadResult.data.sourceId,
      targetHouseIds: payloadResult.data.targetHouseIds,
      sourceTitle: planTaskTitle,
      buildInsert: ({ source, targetHouse, newId, actor, now }) => ({
        id: newId,
        house_id: targetHouse.id,
        title: source.title,
        description: source.description,
        date_mode: source.date_mode,
        deadline_at: source.deadline_at,
        start_date: source.start_date,
        end_date: source.end_date,
        task_status: source.task_status === "archived" ? "planned" : source.task_status,
        priority: source.priority,
        contractor: source.contractor,
        archive_year: source.archive_year,
        sort_order: source.sort_order,
        lifecycle_status: "draft",
        lock_version: 1,
        published_at: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
        created_by: actor.id,
      }),
      targetDescription: ({ source }) =>
        `Створено чернетку завдання плану «${planTaskTitle(source)}» з дублювання.`,
      historyMetadata: planHistoryMetadata(),
      publicPathsForHouse: publicPlanPaths,
    });

    if (!result.ok) return result;

    return ok({
      data: result.data,
      history: {
        entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `Завдання плану «${planTaskTitle(result.data.source)}» дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: planHistoryMetadata({
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        }),
      },
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
