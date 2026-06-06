import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { DeletePlanTaskPayload, HousePlanTask } from "../types";
import {
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  planFilesDeleteRef,
  planHistoryMetadata,
  publicPlanPaths,
  readIdAndLock,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as DeletePlanTaskPayload;

    const { data, error } = await ctx.supabase
      .from("house_plan_tasks")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Завдання не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const task = data as HousePlanTask;

    return ok({
      data: task,
      history: {
        entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
        entityId: task.id,
        action: "deleted",
        description: `Видалено завдання «${task.title}».`,
        beforeSnapshot: task,
        metadata: planHistoryMetadata({
          taskStatus: task.task_status,
        }),
      },
      filesToDelete: [planFilesDeleteRef(task.id)],
      tasks: {
        delete: {
          entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
          entityId: task.id,
        },
      },
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
