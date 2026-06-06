import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_PLAN_DOCUMENTS_BUCKET,
  HOUSE_PLAN_MEDIA_BUCKET,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
  type HousePlanDateMode,
  type HousePlanFileInput,
  type HousePlanTask,
  type HousePlanTaskPriority,
  type HousePlanTaskStatus,
  type PlanIdAndLock,
} from "../types";

export {
  HOUSE_PLAN_DOCUMENTS_BUCKET,
  HOUSE_PLAN_MEDIA_BUCKET,
  HOUSE_PLAN_TASK_ENTITY_TYPE,
};

const validDateModes: HousePlanDateMode[] = ["deadline", "range"];
const validTaskStatuses: HousePlanTaskStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "archived",
];
const validPublishTaskStatuses: HousePlanTaskStatus[] = [
  "planned",
  "in_progress",
  "completed",
];
const validPriorities: HousePlanTaskPriority[] = ["high", "medium", "low"];

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text ? text : null;
}

export function normalizeDateMode(value: unknown): HousePlanDateMode {
  return typeof value === "string" && validDateModes.includes(value as HousePlanDateMode)
    ? (value as HousePlanDateMode)
    : "deadline";
}

export function normalizeTaskStatus(value: unknown): HousePlanTaskStatus {
  return typeof value === "string" && validTaskStatuses.includes(value as HousePlanTaskStatus)
    ? (value as HousePlanTaskStatus)
    : "planned";
}

export function normalizePublishTaskStatus(value: unknown): Exclude<HousePlanTaskStatus, "archived"> {
  return typeof value === "string" &&
    validPublishTaskStatuses.includes(value as HousePlanTaskStatus)
    ? (value as Exclude<HousePlanTaskStatus, "archived">)
    : "planned";
}

export function normalizePriority(value: unknown): HousePlanTaskPriority {
  return typeof value === "string" && validPriorities.includes(value as HousePlanTaskPriority)
    ? (value as HousePlanTaskPriority)
    : "medium";
}

export function normalizeNullableDate(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeArchiveYear(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value >= 2016 && value <= 2026 ? value : null;
}

export function normalizeSortOrder(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function readIdAndLock(rawPayload: unknown): Result<PlanIdAndLock> {
  const payload = rawPayload as Partial<PlanIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID завдання.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію завдання.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getPlanTask(
  ctx: HandlerContext,
  id: string,
): Promise<Result<HousePlanTask>> {
  const { data, error } = await ctx.supabase
    .from("house_plan_tasks")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Завдання не знайдено.", "NOT_FOUND");
  }

  return ok(data as HousePlanTask);
}

export function normalizeFiles(value: unknown): HousePlanFileInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const files: HousePlanFileInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const bucket = typeof record.bucket === "string" ? record.bucket.trim() : "";
    const path = typeof record.path === "string" ? record.path.trim() : "";

    if (!bucket || !path) {
      continue;
    }

    files.push({
      bucket,
      path,
      originalName:
        typeof record.originalName === "string" ? record.originalName : null,
      mimeType: typeof record.mimeType === "string" ? record.mimeType : null,
      size: typeof record.size === "number" ? record.size : null,
    });
  }

  return files;
}

export function planFileKind(file: HousePlanFileInput) {
  if (file.bucket === HOUSE_PLAN_DOCUMENTS_BUCKET || file.mimeType === "application/pdf") {
    return "pdf" as const;
  }

  return "image" as const;
}

export async function getExistingPlanFileCounts(ctx: HandlerContext, entityId: string) {
  const { data, error } = await ctx.supabase
    .from("house_content_files")
    .select("field_key")
    .eq("entity_type", HOUSE_PLAN_TASK_ENTITY_TYPE)
    .eq("entity_id", entityId);

  if (error) {
    return err(error.message, "STORAGE_ERROR");
  }

  const imageKeys = new Set<string>();
  const pdfKeys = new Set<string>();

  for (const row of data ?? []) {
    const fieldKey = String(row.field_key ?? "");
    if (fieldKey.startsWith("image_")) imageKeys.add(fieldKey);
    if (fieldKey.startsWith("pdf_")) pdfKeys.add(fieldKey);
  }

  return ok({
    imageKeys,
    pdfKeys,
    imageCount: imageKeys.size,
    pdfCount: pdfKeys.size,
  });
}

function firstAvailableFieldKey(prefix: "image" | "pdf", existing: Set<string>) {
  const limit = prefix === "image" ? 5 : 2;

  for (let index = 0; index < limit; index += 1) {
    const key = `${prefix}_${index}`;
    if (!existing.has(key)) {
      existing.add(key);
      return key;
    }
  }

  return null;
}

export async function toPlanFileTracks(
  ctx: HandlerContext,
  entityId: string,
  files: HousePlanFileInput[],
): Promise<Result<Array<HousePlanFileInput & { fieldKey: string }>>> {
  const countsResult = await getExistingPlanFileCounts(ctx, entityId);
  if (!countsResult.ok) return countsResult;

  const { imageKeys, pdfKeys } = countsResult.data;
  const tracks: Array<HousePlanFileInput & { fieldKey: string }> = [];

  for (const file of files) {
    const kind = planFileKind(file);
    const fieldKey =
      kind === "pdf"
        ? firstAvailableFieldKey("pdf", pdfKeys)
        : firstAvailableFieldKey("image", imageKeys);

    if (!fieldKey) {
      return err(
        kind === "pdf"
          ? "До одного завдання можна додати максимум 2 PDF."
          : "До одного завдання можна додати максимум 5 зображень.",
        "VALIDATION_FAILED",
      );
    }

    tracks.push({
      ...file,
      fieldKey,
      mimeType:
        file.mimeType ?? (kind === "pdf" ? "application/pdf" : null),
    });
  }

  return ok(tracks);
}

export function planFilesDeleteRef(entityId: string, fieldKeys?: string[]) {
  return {
    entityType: HOUSE_PLAN_TASK_ENTITY_TYPE,
    entityId,
    fieldKeys,
  };
}

export function publicPlanPaths(houseSlug: string) {
  return [`/house/${houseSlug}/plan`];
}

export function planHistoryMetadata(extra?: Record<string, unknown>) {
  return {
    subSectionKey: "plan",
    ...extra,
  };
}

export function planTaskTitle(task: HousePlanTask) {
  return task.title || "Завдання плану робіт";
}

export function validatePlanDates(params: {
  dateMode: HousePlanDateMode;
  deadlineAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  if (params.dateMode === "deadline") {
    return Boolean(params.deadlineAt);
  }

  return Boolean(params.startDate && params.endDate);
}
