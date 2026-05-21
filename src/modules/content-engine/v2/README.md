# Content Engine v2

**Version:** v2.0.0 stable
**Status:** core API frozen after the announcements reference migration.

This module is the Architecture 2.0 command engine for house content administration.

The current stable reference implementation is:

```txt
house_announcements
→ content-engine v2 announcements handler
→ dispatchAdminCommand
→ admin announcements UI
→ public announcements read service
→ /house/[slug]/announcements
```

The remaining house content sections stay on legacy flows until their own N5 migration tasks.

## Stable files

```txt
src/modules/content-engine/v2/
├── client/useAdminContentCommand.ts
├── context.ts
├── dispatch.ts
├── pipeline.ts
├── registry.ts
├── handlers/
│   ├── index.ts
│   └── announcements/
├── services/
│   ├── fileService.ts
│   ├── historyService.ts
│   ├── revalidateService.ts
│   └── taskService.ts
└── types/
    ├── commands.ts
    ├── handler.ts
    ├── pipeline.ts
    └── result.ts
```

## Command shape

```ts
export type AdminCommand = {
  type: `${HandlerKey}.${string}`;
  payload: Record<string, unknown>;
  houseId: string;
};
```

The command type format is:

```txt
<handlerKey>.<commandName>
```

Example:

```ts
await dispatchAdminCommand({
  type: "announcements.publish",
  houseId,
  payload: { id, expectedLockVersion },
});
```

## Handler interface

A migrated section is implemented as a `ContentHandler`:

```ts
export interface ContentHandler {
  readonly key: HandlerKey;
  readonly workspace: HouseWorkspaceKey;

  readonly commands: Record<string, CommandSpec>;

  onBootstrap?(ctx: BootstrapContext): Promise<Result<void>>;

  publicRevalidatePaths?(houseSlug: string): string[];
}
```

Each command is implemented as a `CommandSpec`:

```ts
export interface CommandSpec {
  actionKey: WorkspaceActionKey;
  requiresLockCheck?: boolean;
  validate?(payload: unknown, ctx: HandlerContext): Promise<Result<void>>;
  execute(payload: unknown, ctx: HandlerContext): Promise<Result<ExecResult>>;
}
```

A handler owns domain validation, payload parsing, DB reads, DB writes, optimistic locking, lifecycle status changes, history snapshots, and the returned `ExecResult`.

A handler must not own global dispatch, permission enforcement, common revalidation wiring, common file tracking, common file cleanup, common history insert mechanics, or central registration.

## Dispatch flow

`dispatchAdminCommand(command)` performs this stable flow:

```txt
1. Parse command.type into handlerKey and commandName.
2. Load handler from registry.
3. Load command spec from handler.commands.
4. Build HandlerContext.
5. Check RBAC through assertWorkspaceAction().
6. Run command validation, if present.
7. Run command execute().
8. Run shared pipeline.
9. Return Result<unknown>.
```

## Pipeline flow

Current stable order:

```txt
1. cleanupFiles()          — remove tracked files from storage and house_content_files
2. trackFiles()            — insert new file rows into house_content_files
3. applyTaskOps()          — apply draft approval task operations
4. revalidateForCommand()  — revalidate admin/public paths
5. writeHistory()          — insert house_content_history entry
```

Important implementation notes:

- The domain DB write currently happens inside `CommandSpec.execute()`, before `runPipeline()`.
- `writeHistory()` is currently non-blocking: it catches and logs insert failures instead of failing the command.
- Task operations are currently a compatibility wrapper over legacy draft approval task services. Generic non-`house_section` task support is intentionally left for a later migration stage.

Any change to this order or behavior is a core API change and must be done as a separate explicit mini-task after v2.0.0 stable.

## ExecResult contract

Handlers return an `ExecResult`:

```ts
export type ExecResult = {
  data?: unknown;

  history: {
    entityType: string;
    entityId: string;
    action: string;
    description: string;
    beforeSnapshot?: unknown;
    afterSnapshot?: unknown;
    metadata?: Record<string, unknown>;
  };

  filesToTrack?: FileRef[];

  filesToDelete?: {
    entityType: string;
    entityId: string;
    fieldKeys?: string[];
  }[];

  tasks?: {
    ensure?: { entityType: string; entityId: string; title: string };
    complete?: { entityType: string; entityId: string };
    delete?: { entityType: string; entityId: string };
  };

  extraRevalidatePaths?: string[];
};
```

`history` is required for every successful command.

## Files

Physical upload is not handled by the command bus. Large files are uploaded client-side first. The command payload should then pass file references. Handlers expose file changes through `filesToTrack` and `filesToDelete`.

The pipeline then updates `house_content_files` and removes old files from Supabase Storage when requested.

## Revalidation

Every command revalidates:

```txt
/admin/tasks
/admin/houses/{houseId}
```

A handler may add public paths through:

```ts
publicRevalidatePaths?(houseSlug: string): string[];
```

A command may also return:

```ts
extraRevalidatePaths?: string[];
```

## Registry

Handlers are registered centrally in:

```txt
src/modules/content-engine/v2/handlers/index.ts
```

Current pattern:

```ts
import { registerHandler } from "../registry";
import { announcementsHandler } from "./announcements";

export function registerAllHandlers() {
  registerHandler(announcementsHandler);
}
```

`dispatch.ts` calls `registerAllHandlers()` at module load.

## Client hook

Client components should use:

```ts
const { dispatch, isPending, lastError } = useAdminContentCommand();
```

Example:

```ts
await dispatch(
  {
    type: "announcements.publish",
    houseId,
    payload: { id, expectedLockVersion },
  },
  {
    onSuccess: () => setOpen(false),
    onError: (error) => setFormError(error),
  },
);
```

## Reference handler

The reference handler is:

```txt
src/modules/content-engine/v2/handlers/announcements/
```

It demonstrates domain types, handler export, per-command files, lifecycle commands, optimistic locking, history snapshots, and public path revalidation.

When implementing the next migrated handler, follow the announcements structure unless the task explicitly documents a different pattern.

## Stable API rule

From v2.0.0 stable onward:

- do not change `AdminCommand` shape without a dedicated core mini-task;
- do not change `ContentHandler` / `CommandSpec` without a dedicated core mini-task;
- do not change `ExecResult` without a dedicated core mini-task;
- do not change pipeline order without a dedicated core mini-task;
- do not add broad abstractions unless a migrated handler proves the need;
- prefer handler-local helpers over core changes.

N5 handlers must depend on this API as stable.

## How to create a new handler

Use the template files as a starting point:

```txt
src/modules/content-engine/v2/handlers/_template/handler.ts.template
src/modules/content-engine/v2/handlers/_template/commands/_template.ts.template
```

Recommended flow:

1. Copy `handlers/_template/` to `handlers/<handler_key>/`.
2. Rename `handler.ts.template` to `handler.ts`.
3. Rename `commands/_template.ts.template` to a real command file, for example `commands/create.ts`.
4. Replace placeholders such as `<HANDLER_KEY>`, `<WORKSPACE_KEY>`, `<COMMAND_NAME>`, `<DomainType>`, `<TABLE_NAME>`, and `<ENTITY_TYPE>`.
5. Add domain `types.ts` and `index.ts`, following `handlers/announcements/`.
6. Add every required command to the handler `commands` map.
7. Register the handler in `handlers/index.ts`.
8. Run typecheck/build before using it from UI.

Keep common behavior in the existing command bus and pipeline. Add handler-local helpers first. Change core only through a dedicated mini-task.

