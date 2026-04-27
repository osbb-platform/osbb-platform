export type PlatformTaskStatus =
  | "todo"
  | "in_progress"
  | "review"
  | "done";

export type PlatformTaskType =
  | "manual"
  | "draft_approval"
  | "resident_request"
  | "specialist_request"
  | "system";

export type PlatformTaskPriority =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | null;

export type AdminTaskCommentItem = {
  id: string;
  authorName: string | null;
  content: string;
  createdAt: string | null;
};

export type AdminTaskEventItem = {
  id: string;
  actorName: string | null;
  actionLabel: string;
  beforeValue: string | null;
  afterValue: string | null;
  createdAt: string | null;
};

export type AdminTaskBoardItem = {
  id: string;
  title: string;
  description: string | null;

  status: PlatformTaskStatus;
  taskType: PlatformTaskType;
  priority: PlatformTaskPriority;

  createdAt: string | null;
  updatedAt: string | null;
  deadlineAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;

  assignedToId: string | null;
  assignedToName: string | null;

  createdById: string | null;
  createdByName: string | null;

  housesCount: number;
  primaryHouseId: string | null;
  primaryHouseLabel: string | null;

  isOverdue: boolean;

  comments: AdminTaskCommentItem[];
  events: AdminTaskEventItem[];
};
