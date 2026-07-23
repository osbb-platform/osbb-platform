export const HOUSE_PLAN_TASK_ENTITY_TYPE = "house_plan_task";

export const HOUSE_PLAN_MEDIA_BUCKET = "house-plan-media";
export const HOUSE_PLAN_DOCUMENTS_BUCKET = "house-plan-documents";

export type HousePlanTaskLifecycle = "draft" | "published" | "archived";
export type HousePlanTaskStatus = "planned" | "in_progress" | "completed" | "archived";
export type HousePlanTaskPriority = "high" | "medium" | "low";
export type HousePlanDateMode = "deadline" | "range";

export type HousePlanTask = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  date_mode: HousePlanDateMode;
  deadline_at: string | null;
  start_date: string | null;
  end_date: string | null;
  task_status: HousePlanTaskStatus;
  priority: HousePlanTaskPriority;
  contractor: string | null;
  contractor_id: string | null;
  automation_enabled: boolean;
  automation_interval_days: number | null;
  automation_paused_at: string | null;
  automation_anchor_at: string | null;
  automation_next_due_at: string | null;
  archive_year: number | null;
  sort_order: number;
  lifecycle_status: HousePlanTaskLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
};

export type HousePlanFileInput = {
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type PlanIdAndLock = {
  id: string;
  lockVersion: number;
};

export type CreatePlanTaskPayload = {
  id?: string;
  title: string;
  description?: string;
  dateMode?: HousePlanDateMode;
  deadlineAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  taskStatus?: HousePlanTaskStatus;
  priority?: HousePlanTaskPriority;
  contractor?: string | null;
  contractorId?: string | null;
  automationEnabled?: boolean;
  automationIntervalDays?: number | null;
  archiveYear?: number | null;
  sortOrder?: number;
  files?: HousePlanFileInput[];
};

export type UpdatePlanTaskPayload = CreatePlanTaskPayload & PlanIdAndLock;

export type PublishPlanTaskPayload = PlanIdAndLock & {
  taskStatus?: Exclude<HousePlanTaskStatus, "archived">;
};

export type DeletePlanTaskPayload = PlanIdAndLock;
export type PlanAutomationCommandPayload = PlanIdAndLock;

export type TransitionPlanTaskStatusPayload = PlanIdAndLock & {
  toStatus: Exclude<HousePlanTaskStatus, "archived">;
};


export type AddPlanFilesPayload = PlanIdAndLock & {
  files: HousePlanFileInput[];
};

export type RemovePlanFilesPayload = PlanIdAndLock & {
  fieldKeys: string[];
};
