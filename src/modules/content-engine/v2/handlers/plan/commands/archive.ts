import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePlanTask, PlanIdAndLock } from "../types";
import {
  getPlanTask,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  publicPlanPaths,
  readIdAndLock,
  planHistoryMetadata,
} from "./shared";

export const archiveCommand: CommandSpec = {
  actionKey: "archive",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as PlanIdAndLock;
    const beforeResult = await getPlanTask(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_plan_tasks")
      .update({
        lifecycle_status: "archived",
        task_status: "archived",
        archived_at: before.archived_at ?? now,
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
        action: "archived",
        description: `Архівовано завдання «${task.title}».`,
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
