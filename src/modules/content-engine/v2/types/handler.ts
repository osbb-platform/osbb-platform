import type {
  HouseWorkspaceKey,
  WorkspaceActionKey,
} from "@/src/shared/permissions/rbac.types";

import type { HandlerKey } from "./commands";
import type { BootstrapContext, ExecResult, HandlerContext } from "./pipeline";
import type { Result } from "./result";

export interface CommandSpec {
  actionKey: WorkspaceActionKey;
  requiresLockCheck?: boolean;
  validate?(payload: unknown, ctx: HandlerContext): Promise<Result<void>>;
  execute(payload: unknown, ctx: HandlerContext): Promise<Result<ExecResult>>;
}

export interface ContentHandler {
  readonly key: HandlerKey;
  readonly workspace: HouseWorkspaceKey;

  readonly commands: Record<string, CommandSpec>;

  onBootstrap?(ctx: BootstrapContext): Promise<Result<void>>;

  publicRevalidatePaths?(houseSlug: string): string[];
}
