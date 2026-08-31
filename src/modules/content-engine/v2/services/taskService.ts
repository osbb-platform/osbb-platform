import type { HandlerContext, ExecResult } from "../types/pipeline";
import { err, ok } from "../types/result";
import type { Result } from "../types/result";

type TaskOps = NonNullable<ExecResult["tasks"]>;

const DRAFT_LINK_TYPE = "draft";

type ActiveDraftTask = {
  id: string;
  status: string;
  deleted_at: string | null;
};

function getLinkedTask(
  task:
    | ActiveDraftTask
    | ActiveDraftTask[]
    | null
    | undefined,
): ActiveDraftTask | null {
  if (Array.isArray(task)) {
    return task[0] ?? null;
  }

  return task ?? null;
}

async function findActiveDraftTasks(
  ctx: HandlerContext,
  entityType: string,
  entityId: string,
): Promise<ActiveDraftTask[]> {
  const { data, error } = await ctx.supabase
    .from("platform_task_links")
    .select("task_id, task:platform_tasks(id, status, deleted_at)")
    .eq("link_type", DRAFT_LINK_TYPE)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => getLinkedTask(row.task as ActiveDraftTask | ActiveDraftTask[] | null))
    .filter((task): task is ActiveDraftTask => Boolean(task && !task.deleted_at));
}

async function ensureDraftTask(
  ctx: HandlerContext,
  entityType: string,
  entityId: string,
  title: string,
): Promise<void> {
  const { error } = await ctx.supabase.rpc("ensure_draft_approval_task", {
    p_house_id: ctx.house.id,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_title: title,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function completeDraftTask(
  ctx: HandlerContext,
  entityType: string,
  entityId: string,
): Promise<void> {
  const tasks = await findActiveDraftTasks(ctx, entityType, entityId);

  for (const task of tasks) {
    if (task.status === "done") {
      continue;
    }

    const { error: updateError } = await ctx.supabase
      .from("platform_tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: eventError } = await ctx.supabase
      .from("platform_task_events")
      .insert({
        task_id: task.id,
        actor_id: ctx.user.id,
        event_type: "complete",
        action_label: "Автоматичне завершення задачі",
        before_value: task.status,
        after_value: "done",
      });

    if (eventError) {
      throw new Error(eventError.message);
    }
  }
}

async function deleteDraftTask(
  ctx: HandlerContext,
  entityType: string,
  entityId: string,
): Promise<void> {
  const tasks = await findActiveDraftTasks(ctx, entityType, entityId);

  for (const task of tasks) {
    const { error: updateError } = await ctx.supabase
      .from("platform_tasks")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: eventError } = await ctx.supabase
      .from("platform_task_events")
      .insert({
        task_id: task.id,
        actor_id: ctx.user.id,
        event_type: "delete",
        action_label: "Автоматичне видалення задачі",
        after_value: "deleted",
      });

    if (eventError) {
      throw new Error(eventError.message);
    }
  }
}

export async function applyTaskOps(
  ctx: HandlerContext,
  tasks: TaskOps,
): Promise<Result<void>> {
  try {
    if (tasks.ensure) {
      await ensureDraftTask(
        ctx,
        tasks.ensure.entityType,
        tasks.ensure.entityId,
        tasks.ensure.title,
      );
    }

    if (tasks.complete) {
      await completeDraftTask(
        ctx,
        tasks.complete.entityType,
        tasks.complete.entityId,
      );
    }

    if (tasks.delete) {
      await deleteDraftTask(
        ctx,
        tasks.delete.entityType,
        tasks.delete.entityId,
      );
    }

    return ok(undefined);
  } catch (error) {
    return err(
      error instanceof Error
        ? error.message
        : "Не вдалося виконати операцію із задачею.",
      "INTERNAL",
    );
  }
}
