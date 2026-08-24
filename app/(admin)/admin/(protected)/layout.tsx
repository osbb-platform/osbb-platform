export const dynamic = "force-dynamic";
import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { redirect } from "next/navigation";
import { IdleLockProvider } from "@/src/modules/auth/components/IdleLockProvider";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getAdminCityOptions } from "@/src/modules/auth/services/getAdminCityOptions";
import { AdminCitySelectionGate } from "@/src/modules/auth/components/AdminCitySelectionGate";
import { AdminShell } from "@/src/modules/cms/components/AdminShell";
import { getActiveTasksCount } from "@/src/modules/tasks/services/getActiveTasksCount";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { ToastProvider } from "@/src/shared/ui/toast/ToastProvider";

type ProtectedAdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || !currentUser.role) {
    redirect(ROUTES.admin.login);
  }

  const cityContext = await getAdminCityContext();

  if (currentUser.role === ROLES.SUPERADMIN && !cityContext) {
    const cities = await getAdminCityOptions();
    return <AdminCitySelectionGate cities={cities} />;
  }

  const access = getResolvedAccess(currentUser.role);
  const activeTasksCount = access.topLevel.tasks
    ? await getActiveTasksCount()
    : 0;

  return (
    <ToastProvider>
      <IdleLockProvider userEmail={currentUser.email}>
        <AdminShell
          currentUser={currentUser}
          access={access}
          activeTasksCount={activeTasksCount}
        >
          {children}
        </AdminShell>
      </IdleLockProvider>
    </ToastProvider>
  );
}
