import type { CommandSpec } from "../../../types/handler";
import { createAutomationSchedule } from "../automation";
import { err, ok } from "../../../types/result";
import type { HousePlanTask, PublishPlanTaskPayload } from "../types";
import {
  getPlanTask,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  normalizePublishTaskStatus,
  publicPlanPaths,
  readIdAndLock,
  planHistoryMetadata,
  validatePlanDates,
} from "./shared";

export const publishCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as PublishPlanTaskPayload;
    const beforeResult = await getPlanTask(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (
      !validatePlanDates({
        dateMode: before.date_mode,
        deadlineAt: before.deadline_at,
        startDate: before.start_date,
        endDate: before.end_date,
      })
    ) {
      return err("Заповніть дату або період виконання завдання.", "VALIDATION_FAILED");
    }

    const now = new Date().toISOString();
    const taskStatus = normalizePublishTaskStatus(payload.taskStatus ?? before.task_status);

    const automationSchedule = createAutomationSchedule({
      enabled: before.automation_enabled,
      intervalDays: before.automation_interval_days,
      anchorAt: now,
    });

    const { data, error } = await ctx.supabase
      .from("house_plan_tasks")
      .update({
        lifecycle_status: "published",
        task_status: taskStatus,
        published_at: before.published_at ?? now,
        archived_at: null,
        automation_paused_at: null,
        automation_anchor_at: automationSchedule.automationAnchorAt,
        automation_next_due_at: automationSchedule.automationNextDueAt,
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
        action: "published",
        description: `Опубліковано завдання «${task.title}».`,
        beforeSnapshot: before,
        afterSnapshot: task,
        metadata: planHistoryMetadata({
          taskStatus: task.task_status,
        }),
      },
      tasks: {
        complete: {
          entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
          entityId: task.id,
        },
      },
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
