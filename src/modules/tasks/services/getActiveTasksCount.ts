import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function getActiveTasksCount() {
  try {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from("platform_tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .is("archived_at", null)
      .is("deleted_at", null);

    if (error) {
      console.error("Failed to count active tasks:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error("getActiveTasksCount crash:", error);
    return 0;
  }
}
