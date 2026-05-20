import type { AdminCommand } from "./types/commands";
import type { ContentHandler } from "./types/handler";
import type { ExecResult, HandlerContext } from "./types/pipeline";
import { err, ok } from "./types/result";
import type { Result } from "./types/result";
import { cleanupFiles, trackFiles } from "./services/fileService";
import { writeHistory } from "./services/historyService";
import { revalidateForCommand } from "./services/revalidateService";
import { applyTaskOps } from "./services/taskService";

export async function runPipeline(args: {
  handler: ContentHandler;
  command: AdminCommand;
  ctx: HandlerContext;
  execResult: ExecResult;
}): Promise<Result<void>> {
  const { handler, ctx, execResult } = args;

  if (execResult.filesToDelete?.length) {
    const cleanupResult = await cleanupFiles(ctx.supabase, execResult.filesToDelete);
    if (!cleanupResult.ok) return cleanupResult;
  }

  if (execResult.filesToTrack?.length) {
    const trackResult = await trackFiles(ctx.supabase, {
      entityType: execResult.history.entityType,
      entityId: execResult.history.entityId,
      files: execResult.filesToTrack,
    });

    if (!trackResult.ok) return trackResult;
  }

  if (execResult.tasks) {
    const taskResult = await applyTaskOps(ctx, execResult.tasks);
    if (!taskResult.ok) return taskResult;
  }

  try {
    await revalidateForCommand({
      handler,
      houseId: ctx.house.id,
      houseSlug: ctx.house.slug,
      extraPaths: execResult.extraRevalidatePaths,
    });
  } catch (error) {
    console.error("revalidateForCommand failed:", error);
    return err("Не вдалося оновити кеш сторінок.", "INTERNAL");
  }

  await writeHistory(ctx.supabase, {
    actor: ctx.user,
    houseId: ctx.house.id,
    entry: execResult.history,
  });

  return ok(undefined);
}
