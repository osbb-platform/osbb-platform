import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePlanTask, PlanIdAndLock } from "../types";
import {
  getPlanTask,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  planHistoryMetadata,
  planTaskTitle,
  publicPlanPaths,
  readIdAndLock,
} from "./shared";

export const restoreCommand: CommandSpec = {
  actionKey: "edit",
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
        lifecycle_status: "draft",
        task_status: before.task_status === "archived" ? "planned" : before.task_status,
        published_at: null,
        archived_at: null,
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
        action: "restored",
        description: `Відновлено завдання «${task.title}».`,
        beforeSnapshot: before,
        afterSnapshot: task,
        metadata: planHistoryMetadata({
          taskStatus: task.task_status,
        }),
      },
      tasks: {
        ensure: {
          entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
          entityId: task.id,
          title: planTaskTitle(task),
        },
      },
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
