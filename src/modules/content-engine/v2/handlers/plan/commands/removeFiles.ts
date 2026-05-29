import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePlanTask, RemovePlanFilesPayload } from "../types";
import {
  getPlanTask,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  planFilesDeleteRef,
  planHistoryMetadata,
  publicPlanPaths,
  readIdAndLock,
} from "./shared";

export const removeFilesCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<RemovePlanFilesPayload>;

    if (!Array.isArray(payload.fieldKeys) || payload.fieldKeys.length === 0) {
      return err("Не передано файли для видалення.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as RemovePlanFilesPayload;
    const beforeResult = await getPlanTask(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const fieldKeys = payload.fieldKeys
      .map((fieldKey) => String(fieldKey).trim())
      .filter((fieldKey) => fieldKey.startsWith("image_") || fieldKey.startsWith("pdf_"));

    if (!fieldKeys.length) {
      return err("Не передано валідні файли для видалення.", "VALIDATION_FAILED");
    }

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_plan_tasks")
      .update({
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
        action: "files_removed",
        description: `Видалено файли із завдання «${task.title}».`,
        beforeSnapshot: before,
        afterSnapshot: task,
        metadata: planHistoryMetadata({
          fieldKeys,
        }),
      },
      filesToDelete: [planFilesDeleteRef(task.id, fieldKeys)],
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
