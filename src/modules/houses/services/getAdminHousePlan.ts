import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HousePlanTask,
  HousePlanTaskLifecycle,
  HousePlanTaskPriority,
  HousePlanTaskStatus,
  HousePlanDateMode,
} from "@/src/modules/content-engine/v2/handlers/plan/types";

type HousePlanFileRow = {
  entity_id: string;
  field_key: string;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
};

export type HousePlanAttachmentSnapshot = {
  id: string;
  fieldKey: string;
  path: string;
  url: string | null;
  fileName?: string;
  kind: "image" | "pdf";
  createdAt: string;
  bucket: string;
  mimeType: string | null;
  size: number | null;
};

export type HousePlanTaskSnapshot = {
  id: string;
  title: string;
  status: HousePlanTaskStatus | "draft";
  lifecycleStatus: HousePlanTaskLifecycle;
  lockVersion: number;
  content: {
    title: string;
    description: string;
    taskStatus: HousePlanTaskStatus;
    priority: HousePlanTaskPriority;
    dateMode: HousePlanDateMode;
    deadlineAt: string | null;
    startDate: string | null;
    endDate: string | null;
    contractor: string | null;
    contractorId: string | null;
    archiveYear: number | null;
    sortOrder: number;
    images: HousePlanAttachmentSnapshot[];
    documents: HousePlanAttachmentSnapshot[];
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    archivedAt: string | null;
    lockVersion: number;
  };
};

export type AdminHousePlanSnapshot = {
  tasks: HousePlanTaskSnapshot[];
};

function buildPublicStorageUrl(row: Pick<HousePlanFileRow, "storage_bucket" | "storage_path">) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${row.storage_bucket}/${row.storage_path}`;
}

function fileKind(fieldKey: string, mimeType: string | null): "image" | "pdf" {
  if (fieldKey.startsWith("pdf_") || mimeType === "application/pdf") {
    return "pdf";
  }

  return "image";
}

function mapFile(row: HousePlanFileRow): HousePlanAttachmentSnapshot {
  const kind = fileKind(row.field_key, row.mime_type);

  return {
    id: row.field_key,
    fieldKey: row.field_key,
    path: row.storage_path,
    url: buildPublicStorageUrl(row),
    fileName: row.original_file_name ?? undefined,
    kind,
    createdAt: row.uploaded_at ?? "",
    bucket: row.storage_bucket,
    mimeType: row.mime_type,
    size: row.size_bytes,
  };
}

function sortFiles(left: HousePlanAttachmentSnapshot, right: HousePlanAttachmentSnapshot) {
  return left.fieldKey.localeCompare(right.fieldKey, "uk");
}

export function mapHousePlanTask(
  task: HousePlanTask,
  filesByEntityId: Map<string, HousePlanFileRow[]>,
): HousePlanTaskSnapshot {
  const files = (filesByEntityId.get(task.id) ?? []).map(mapFile);
  const images = files.filter((file) => file.kind === "image").sort(sortFiles);
  const documents = files.filter((file) => file.kind === "pdf").sort(sortFiles);

  const uiStatus: HousePlanTaskStatus | "draft" =
    task.lifecycle_status === "draft" ? "draft" : task.task_status;

  return {
    id: task.id,
    title: task.title,
    status: uiStatus,
    lifecycleStatus: task.lifecycle_status,
    lockVersion: task.lock_version,
    content: {
      title: task.title,
      description: task.description,
      taskStatus: task.task_status,
      priority: task.priority,
      dateMode: task.date_mode,
      deadlineAt: task.deadline_at,
      startDate: task.start_date,
      endDate: task.end_date,
      contractor: task.contractor,
      contractorId: task.contractor_id,
      archiveYear: task.archive_year,
      sortOrder: task.sort_order,
      images,
      documents,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      publishedAt: task.published_at,
      archivedAt: task.archived_at,
      lockVersion: task.lock_version,
    },
  };
}

async function loadPlanFiles(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  taskIds: string[];
}) {
  if (params.taskIds.length === 0) {
    return new Map<string, HousePlanFileRow[]>();
  }

  const { data, error } = await params.supabase
    .from("house_content_files")
    .select(
      [
        "entity_id",
        "field_key",
        "storage_bucket",
        "storage_path",
        "original_file_name",
        "mime_type",
        "size_bytes",
        "uploaded_at",
      ].join(", "),
    )
    .eq("entity_type", "house_plan_task")
    .in("entity_id", params.taskIds);

  if (error) {
    console.error("Failed to load house plan task files:", error.message);
    return new Map<string, HousePlanFileRow[]>();
  }

  const filesByEntityId = new Map<string, HousePlanFileRow[]>();

  for (const file of (data ?? []) as unknown as HousePlanFileRow[]) {
    const files = filesByEntityId.get(file.entity_id) ?? [];
    files.push(file);
    filesByEntityId.set(file.entity_id, files);
  }

  return filesByEntityId;
}

export async function getAdminHousePlan(params: {
  houseId: string;
}): Promise<AdminHousePlanSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_plan_tasks")
    .select("*")
    .eq("house_id", params.houseId)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load admin house plan:", error.message);
    return { tasks: [] };
  }

  const tasks = (data ?? []) as unknown as HousePlanTask[];
  const filesByEntityId = await loadPlanFiles({
    supabase,
    taskIds: tasks.map((task) => task.id),
  });

  return {
    tasks: tasks.map((task) => mapHousePlanTask(task, filesByEntityId)),
  };
}
