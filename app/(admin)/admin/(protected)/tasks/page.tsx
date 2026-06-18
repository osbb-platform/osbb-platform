import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { cleanupPlatformTasks } from "@/src/modules/tasks/services/cleanupPlatformTasks";
import { AdminTasksKanban } from "@/src/modules/tasks/components/AdminTasksKanban";
import { getAdminTasksBoard } from "@/src/modules/tasks/services/getAdminTasksBoard";
import { getTaskAssignees } from "@/src/modules/tasks/services/getTaskAssignees";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export default async function AdminTasksPage() {
  const [currentUser, assignees, houses] = await Promise.all([
    getCurrentAdminUser(),
    getTaskAssignees(),
    getAdminHouses(),
  ]);

  if (!currentUser) {
    redirect(ROUTES.admin.login);
  }

  assertTopLevelAccess(currentUser.role, "tasks");

  await cleanupPlatformTasks();
  const tasks = await getAdminTasksBoard();

  return (
    <AdminTasksKanban
      initialTasks={tasks}
      assignees={assignees}
      houses={houses.map((house) => ({
        id: house.id,
        name: house.name,
      }))}
    />
  );
}
