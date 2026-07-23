import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreatePlanTaskPayload, HousePlanTask } from "../types";
import {
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  normalizeArchiveYear,
  normalizeDateMode,
  normalizeFiles,
  normalizeNullableDate,
  normalizeOptionalText,
  normalizePriority,
  normalizeSortOrder,
  normalizeTaskStatus,
  normalizeText,
  planHistoryMetadata,
  planTaskTitle,
  readAutomationConfiguration,
  publicPlanPaths,
  toPlanFileTracks,
  validatePlanDates,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreatePlanTaskPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву завдання.", "VALIDATION_FAILED");
    }

    const dateMode = normalizeDateMode(payload.dateMode);
if (
      !validatePlanDates({
        dateMode,
        deadlineAt: normalizeNullableDate(payload.deadlineAt),
        startDate: normalizeNullableDate(payload.startDate),
        endDate: normalizeNullableDate(payload.endDate),
      })
    ) {
      return err("Заповніть дату або період виконання завдання.", "VALIDATION_FAILED");
    }

    const automationResult = readAutomationConfiguration(payload);
    if (!automationResult.ok) return automationResult;
return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreatePlanTaskPayload;
    const now = new Date().toISOString();
    const dateMode = normalizeDateMode(payload.dateMode);

    const automationResult = readAutomationConfiguration(payload);
    if (!automationResult.ok) return automationResult;
    const automation = automationResult.data;

    const { data, error } = await ctx.supabase
      .from("house_plan_tasks")
      .insert({
        id: payload.id,
        house_id: ctx.house.id,
        title: normalizeText(payload.title),
        description: normalizeText(payload.description),
        date_mode: dateMode,
        deadline_at: dateMode === "deadline" ? normalizeNullableDate(payload.deadlineAt) : null,
        start_date: dateMode === "range" ? normalizeNullableDate(payload.startDate) : null,
        end_date: dateMode === "range" ? normalizeNullableDate(payload.endDate) : null,
        task_status: normalizeTaskStatus(payload.taskStatus),
        priority: normalizePriority(payload.priority),
        contractor: normalizeOptionalText(payload.contractor),
        contractor_id:
          typeof payload.contractorId === "string" && payload.contractorId.trim()
            ? payload.contractorId.trim()
            : null,
        automation_enabled: automation.enabled,
        automation_interval_days: automation.intervalDays,
        automation_paused_at: null,
        automation_anchor_at: null,
        automation_next_due_at: null,
        archive_year: normalizeArchiveYear(payload.archiveYear),
        sort_order: normalizeSortOrder(payload.sortOrder),
        lifecycle_status: "draft",
        lock_version: 1,
        created_at: now,
        updated_at: now,
        created_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(error?.message ?? "Не вдалося створити завдання.", "INTERNAL");
    }

    const task = data as HousePlanTask;
    const files = normalizeFiles(payload.files);
    const fileTracksResult = await toPlanFileTracks(ctx, task.id, files);

    if (!fileTracksResult.ok) {
      return fileTracksResult;
    }

    return ok({
      data: task,
      history: {
        entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
        entityId: task.id,
        action: "created",
        description: `Створено завдання «${task.title}».`,
        afterSnapshot: task,
        metadata: planHistoryMetadata({
          taskStatus: task.task_status,
        }),
      },
      filesToTrack: fileTracksResult.data,
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
