import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { cleanupPlatformTasks } from "@/src/modules/tasks/services/cleanupPlatformTasks";
import { AdminTasksKanban } from "@/src/modules/tasks/components/AdminTasksKanban";
import { getAdminTasksBoard } from "@/src/modules/tasks/services/getAdminTasksBoard";
import { getTaskAssignees } from "@/src/modules/tasks/services/getTaskAssignees";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export default async function AdminTasksPage() {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect("/admin/login");
  }

  assertTopLevelAccess(currentUser.role, "tasks");

  await cleanupPlatformTasks();
  const [tasks, assignees, houses] = await Promise.all([
    getAdminTasksBoard(),
    getTaskAssignees(),
    getAdminHouses(),
  ]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--cms-text-primary)]">
            Управління задачами
          </h1>

          <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-semibold text-[var(--cms-text-secondary)]">
            DEMO
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--cms-text-secondary)]">
          Розділ уже доступний для роботи та проходить фінальне доопрацювання першої production-версії.
        </p>
      </div>

      <AdminTasksKanban
        initialTasks={tasks}
        assignees={assignees}
        houses={houses.map((house) => ({
          id: house.id,
          name: house.name,
        }))}
      />
    </div>
  );
}
