import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { AddPlanFilesPayload, HousePlanTask } from "../types";
import {
  getPlanTask,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  normalizeFiles,
  planHistoryMetadata,
  publicPlanPaths,
  readIdAndLock,
  toPlanFileTracks,
} from "./shared";

export const addFilesCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<AddPlanFilesPayload>;
    const files = normalizeFiles(payload.files);

    if (!files.length) {
      return err("Не передано файли для додавання.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as AddPlanFilesPayload;
    const beforeResult = await getPlanTask(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const files = normalizeFiles(payload.files);
    const fileTracksResult = await toPlanFileTracks(ctx, before.id, files);

    if (!fileTracksResult.ok) {
      return fileTracksResult;
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
        action: "files_added",
        description: `Додано файли до завдання «${task.title}».`,
        beforeSnapshot: before,
        afterSnapshot: task,
        metadata: planHistoryMetadata({
          filesCount: fileTracksResult.data.length,
        }),
      },
      filesToTrack: fileTracksResult.data,
      extraRevalidatePaths: publicPlanPaths(ctx.house.slug),
    });
  },
};
