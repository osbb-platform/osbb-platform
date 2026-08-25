import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getAdminScopedTaskIds } from "@/src/modules/tasks/services/getAdminScopedTaskIds";

export async function getActiveTasksCount() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("platform_tasks")
      .select("id, created_by")
      .neq("status", "done")
      .is("archived_at", null)
      .is("deleted_at", null);
    if (error) {
      console.error("Failed to count active tasks:", error.message);
      return 0;
    }
    const allowedTaskIds = await getAdminScopedTaskIds(
      (data ?? []).map((task) => ({ id: task.id, created_by: task.created_by ?? null })),
    );
    return allowedTaskIds.size;
  } catch (error) {
    console.error("getActiveTasksCount crash:", error);
    return 0;
  }
}
