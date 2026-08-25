import "server-only";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminCityScope } from "@/src/modules/auth/services/getAdminCityScope";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";

type CandidateTask = {
  id: string;
  created_by: string | null;
};

export async function getAdminScopedTaskIds(
  candidates: CandidateTask[],
): Promise<Set<string>> {
  if (candidates.length === 0) {
    return new Set();
  }

  const [scope, currentUser] = await Promise.all([
    getAdminCityScope(),
    getCurrentAdminUser(),
  ]);

  if (!scope || !currentUser) {
    return new Set();
  }

  const taskIds = candidates.map((task) => task.id);
  const supabase = await createSupabaseServerClient();

  const { data: relations, error } = await supabase
    .from("platform_task_houses")
    .select("task_id, house_id")
    .in("task_id", taskIds);

  if (error) {
    console.error("getAdminScopedTaskIds relations error:", error.message);
    return new Set();
  }

  const relationsByTask = new Map<string, string[]>();

  for (const relation of relations ?? []) {
    const taskId = String(relation.task_id ?? "").trim();
    const houseId = String(relation.house_id ?? "").trim();

    if (!taskId || !houseId) {
      continue;
    }

    const bucket = relationsByTask.get(taskId) ?? [];
    bucket.push(houseId);
    relationsByTask.set(taskId, bucket);
  }

  const cityHouseIds = new Set(scope.houseIds);
  const allowed = new Set<string>();

  for (const task of candidates) {
    const relatedHouseIds = relationsByTask.get(task.id) ?? [];

    if (relatedHouseIds.length === 0) {
      if (task.created_by === currentUser.id) {
        allowed.add(task.id);
      }
      continue;
    }

    if (relatedHouseIds.every((houseId) => cityHouseIds.has(houseId))) {
      allowed.add(task.id);
    }
  }

  return allowed;
}
