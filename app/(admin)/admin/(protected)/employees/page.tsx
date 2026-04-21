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
    redirect("/admin/login");
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
      <CreateEmployeeForm currentRole={currentUser.role} />

      <EmployeesToolbar
        selectedRole={selectedRole}
        selectedStatus={selectedStatus}
        search={search}
      />

      {employees.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-slate-400">
          По текущим фильтрам сотрудники не найдены.
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
