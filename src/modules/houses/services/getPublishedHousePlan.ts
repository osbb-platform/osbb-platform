import { unstable_cache } from "next/cache";
import { compareHousePlanTasks } from "@/src/modules/houses/utils/sortHousePlanTasks";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  logOptionalPublicReadError,
  throwRequiredPublicReadError,
} from "./publicContentResilience";
import type { HousePlanTask } from "@/src/modules/content-engine/v2/handlers/plan/types";
import {
  mapHousePlanTask,
  type AdminHousePlanSnapshot,
} from "./getAdminHousePlan";

type SupabasePublicClient = ReturnType<typeof createSupabasePublicClient>;

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

async function loadPlanFiles(params: {
  supabase: SupabasePublicClient;
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
    logOptionalPublicReadError({
      section: "plan",
      resource: "house_content_files",
      houseId: "multiple-plan-tasks",
      error,
      details: {
        taskIds: params.taskIds,
      },
    });

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

async function loadPublishedHousePlan(houseId: string): Promise<AdminHousePlanSnapshot> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_plan_tasks")
    .select("*")
    .eq("house_id", houseId)
    .in("lifecycle_status", ["published", "archived"])
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throwRequiredPublicReadError({
      section: "plan",
      resource: "house_plan_tasks",
      houseId,
      error,
    });
  }

  const tasks = (data ?? []) as unknown as HousePlanTask[];
  const filesByEntityId = await loadPlanFiles({
    supabase,
    taskIds: tasks.map((task) => task.id),
  });

  return {
    tasks: tasks.map((task) => mapHousePlanTask(task, filesByEntityId)).sort((left, right) =>
      compareHousePlanTasks(
        { id: left.id, taskStatus: left.content.taskStatus, sortOrder: left.content.sortOrder, updatedAt: left.content.updatedAt, completedAt: left.content.completedAt },
        { id: right.id, taskStatus: right.content.taskStatus, sortOrder: right.content.sortOrder, updatedAt: right.content.updatedAt, completedAt: right.content.completedAt },
      ),
    ),
  };
}

export const getPublishedHousePlan = cache(
  async (houseId: string): Promise<AdminHousePlanSnapshot> => {
    return unstable_cache(
      () => loadPublishedHousePlan(houseId),
      ["published-house-plan-v2", houseId],
      {
        tags: [`house:${houseId}:plan`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
