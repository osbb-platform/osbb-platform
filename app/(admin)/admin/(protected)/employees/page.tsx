import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { CreateEmployeeForm } from "@/src/modules/employees/components/CreateEmployeeForm";
import { EmployeeCard } from "@/src/modules/employees/components/EmployeeCard";
import { EmployeesToolbar } from "@/src/modules/employees/components/EmployeesToolbar";
import { getAdminEmployees } from "@/src/modules/employees/services/getAdminEmployees";
import {
  assertTopLevelAccess,
  getResolvedAccess,
} from "@/src/shared/permissions/rbac.guards";

type AdminEmployeesPageProps = {
  searchParams?: Promise<{
    role?: string;
    status?: string;
    search?: string;
  }>;
};

export default async function AdminEmployeesPage({
  searchParams,
}: AdminEmployeesPageProps) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect(ROUTES.admin.login);
  }

  assertTopLevelAccess(currentUser.role, "employees");

  const resolvedSearchParams = (await searchParams) ?? {};
  const access = getResolvedAccess(currentUser.role);

  const selectedRole = resolvedSearchParams.role?.trim() ?? "";
  const selectedStatus = resolvedSearchParams.status?.trim() ?? "";
  const search = resolvedSearchParams.search?.trim() ?? "";

  const employees = await getAdminEmployees({
    role: selectedRole || null,
    status: selectedStatus || null,
    search: search || null,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-sm)]">
        <CreateEmployeeForm currentRole={currentUser.role} />

        <div className="mt-6 border-t border-[var(--cms-border)] pt-5">
          <EmployeesToolbar
            selectedRole={selectedRole}
            selectedStatus={selectedStatus}
            search={search}
          />
        </div>
      </section>

      {employees.length === 0 ? (
        <div className="rounded-[var(--r-xl)] border border-dashed border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] p-6 text-[var(--cms-text-muted)]">
          За поточними фільтрами співробітників не знайдено.
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.membershipId}
              employee={employee}
              currentUserId={currentUser.id}
              access={access.employees}
            />
          ))}
        </div>
      )}
    </div>
  );
}
