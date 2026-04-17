import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { CreateEmployeeForm } from "@/src/modules/employees/components/CreateEmployeeForm";
import { EmployeeCard } from "@/src/modules/employees/components/EmployeeCard";
import { EmployeesToolbar } from "@/src/modules/employees/components/EmployeesToolbar";
import { getAdminEmployees } from "@/src/modules/employees/services/getAdminEmployees";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

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
  const resolvedSearchParams = (await searchParams) ?? {};

  const access = getResolvedAccess(currentUser?.role);
  const hasAccess = access.topLevel.employees;

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-amber-800/40 bg-amber-950/30 p-6">
          <div className="inline-flex rounded-full bg-amber-900/60 px-3 py-1 text-xs font-medium text-amber-200">
            Access limited
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Сотрудники
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            У текущего профиля пока нет доступа к разделу управления сотрудниками.
          </p>
        </div>
      </div>
    );
  }

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
      <CreateEmployeeForm currentRole={currentUser?.role ?? null} />

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
              access={access.employees}
            />
          ))}
        </div>
      )}
    </div>
  );
}
