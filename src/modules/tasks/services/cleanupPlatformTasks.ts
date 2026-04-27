import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function cleanupPlatformTasks() {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc("cleanup_platform_tasks");

    if (error) {
      console.error(
        "Failed to cleanup platform tasks:",
        error.message,
      );
    }
  } catch (error) {
    console.error("cleanupPlatformTasks crash:", error);
  }
}
