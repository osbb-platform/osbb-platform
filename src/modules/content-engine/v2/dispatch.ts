"use server";

import { assertWorkspaceAction } from "@/src/shared/permissions/actionAccess";

import { buildHandlerContext } from "./context";
import { registerAllHandlers } from "./handlers";
import { runPipeline } from "./pipeline";
import { getHandler } from "./registry";
import type { HandlerKey, AdminCommand } from "./types/commands";
import { err, ok } from "./types/result";
import type { Result } from "./types/result";

registerAllHandlers();

const handlerKeyFromType = (type: string) => type.split(".")[0];
const commandNameFromType = (type: string) => type.split(".").slice(1).join(".");

export async function dispatchAdminCommand(
  command: AdminCommand,
): Promise<Result<unknown>> {
  try {
    const handlerKey = handlerKeyFromType(command.type);
    const handler = getHandler(handlerKey as HandlerKey);

    if (!handler) {
      return err(`Розділ ${handlerKey} не зареєстровано.`, "HANDLER_NOT_FOUND");
    }

    const commandName = commandNameFromType(command.type);
    const spec = handler.commands[commandName];

    if (!spec) {
      return err(`Команда ${command.type} не підтримується.`, "COMMAND_NOT_FOUND");
    }

    const ctxResult = await buildHandlerContext(command);
    if (!ctxResult.ok) return ctxResult;

    const ctx = ctxResult.data;

    const accessError = assertWorkspaceAction({
      role: ctx.user.role as never,
      workspace: handler.workspace,
      action: spec.actionKey,
    });

    if (accessError?.error) {
      return err(accessError.error, "FORBIDDEN");
    }

    if (spec.validate) {
      const validation = await spec.validate(command.payload, ctx);
      if (!validation.ok) return validation;
    }

    const execResult = await spec.execute(command.payload, ctx);
    if (!execResult.ok) return execResult;

    const pipelineResult = await runPipeline({
      handler,
      command,
      ctx,
      execResult: execResult.data,
    });

    if (!pipelineResult.ok) return pipelineResult;

    return ok(execResult.data.data);
  } catch (error) {
    console.error("dispatchAdminCommand crash:", error);

    return err(
      error instanceof Error ? error.message : "Невідома помилка.",
      "INTERNAL",
    );
  }
}
