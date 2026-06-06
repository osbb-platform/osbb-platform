import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePlanTask, UpdatePlanTaskPayload } from "../types";
import {
  getPlanTask,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  normalizeArchiveYear,
  normalizeDateMode,
  normalizeNullableDate,
  normalizeOptionalText,
  normalizePriority,
  normalizeSortOrder,
  normalizeTaskStatus,
  normalizeText,
  planHistoryMetadata,
  planTaskTitle,
  publicPlanPaths,
  readIdAndLock,
  validatePlanDates,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdatePlanTaskPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву завдання.", "VALIDATION_FAILED");
    }

    const dateMode = normalizeDateMode(payload.dateMode);
    if (
      !validatePlanDates({
        dateMode,
        deadlineAt: normalizeNullableDate(payload.deadlineAt),
        startDate: normalizeNullableDate(payload.startDate),
        endDate: normalizeNullableDate(payload.endDate),
      })
    ) {
      return err("Заповніть дату або період виконання завдання.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdatePlanTaskPayload;
    const beforeResult = await getPlanTask(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const now = new Date().toISOString();
    const dateMode = normalizeDateMode(payload.dateMode);

    const { data, error } = await ctx.supabase
      .from("house_plan_tasks")
      .update({
        title: normalizeText(payload.title),
        description: normalizeText(payload.description),
        date_mode: dateMode,
        deadline_at: dateMode === "deadline" ? normalizeNullableDate(payload.deadlineAt) : null,
        start_date: dateMode === "range" ? normalizeNullableDate(payload.startDate) : null,
        end_date: dateMode === "range" ? normalizeNullableDate(payload.endDate) : null,
        task_status: normalizeTaskStatus(payload.taskStatus),
        priority: normalizePriority(payload.priority),
        contractor: normalizeOptionalText(payload.contractor),
        archive_year: normalizeArchiveYear(payload.archiveYear),
        sort_order: normalizeSortOrder(payload.sortOrder),
        updated_at: now,
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const task = data as HousePlanTask;

    return ok({
      data: task,
      history: {
        entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
        entityId: task.id,
        action: "updated",
        description: `Оновлено завдання «${task.title}».`,
        beforeSnapshot: before,
        afterSnapshot: task,
        metadata: planHistoryMetadata({
          taskStatus: task.task_status,
        }),
      },
      tasks:
        task.lifecycle_status === "draft"
          ? {
              ensure: {
                entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
                entityId: task.id,
                title: planTaskTitle(task),
              },
            }
          : undefined,
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
