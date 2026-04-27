export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { AdminShell } from "@/src/modules/cms/components/AdminShell";
import { getActiveTasksCount } from "@/src/modules/tasks/services/getActiveTasksCount";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type ProtectedAdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || !currentUser.role) {
    redirect("/admin/login");
  }

  const access = getResolvedAccess(currentUser.role);
  const activeTasksCount = access.topLevel.tasks
    ? await getActiveTasksCount()
    : 0;

  return (
    <AdminShell
      currentUser={currentUser}
      access={access}
      activeTasksCount={activeTasksCount}
    >
      {children}
    </AdminShell>
  );
}
