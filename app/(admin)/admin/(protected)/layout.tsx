export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { AdminShell } from "@/src/modules/cms/components/AdminShell";
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

  return <AdminShell currentUser={currentUser} access={access}>{children}</AdminShell>;
}
