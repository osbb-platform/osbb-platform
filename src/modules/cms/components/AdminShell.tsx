import { AdminSidebar } from "@/src/modules/cms/components/AdminSidebar";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";
import type { ResolvedRoleAccess } from "@/src/shared/permissions/rbac.types";

type AdminShellProps = Readonly<{
  currentUser: CurrentAdminUser;
  access: ResolvedRoleAccess;
  children: React.ReactNode;
}>;

export function AdminShell({ currentUser, access, children }: AdminShellProps) {
  return (
    <div className="h-dvh overflow-hidden bg-slate-950 text-white lg:flex">
      <AdminSidebar currentUser={currentUser} access={access} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
