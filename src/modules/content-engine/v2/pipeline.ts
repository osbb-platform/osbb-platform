import type { AdminCommand } from "./types/commands";
import type { ContentHandler } from "./types/handler";
import type { ExecResult, HandlerContext } from "./types/pipeline";
import { ok } from "./types/result";
import type { Result } from "./types/result";
import { cleanupFiles, removeUntrackedFiles, trackFiles } from "./services/fileService";
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

    if (!trackResult.ok) {
      await removeUntrackedFiles(ctx.supabase, execResult.filesToTrack);
      return trackResult;
    }
  }

  if (execResult.tasks) {
    const taskResult = await applyTaskOps(ctx, execResult.tasks);

    if (!taskResult.ok) {
      console.error("Command pipeline task side effect failed after domain mutation", {
        houseId: ctx.house.id,
        commandType: args.command.type,
        code: taskResult.code ?? null,
        error: taskResult.error,
      });
    }
  }

  try {
    await revalidateForCommand({
      handler,
      houseId: ctx.house.id,
      houseSlug: ctx.house.slug,
      extraPaths: execResult.extraRevalidatePaths,
    });
  } catch (error) {
    console.error("Command pipeline cache revalidate failed after domain mutation", {
      houseId: ctx.house.id,
      commandType: args.command.type,
      error,
    });
  }

  await writeHistory(ctx.supabase, {
    actor: ctx.user,
    houseId: ctx.house.id,
    entry: execResult.history,
  });

  return ok(undefined);
}
