import type { ResolvedRoleAccess } from "@/src/shared/permissions/rbac.types";
import type { AdminEmployeeRecord } from "@/src/modules/employees/services/getAdminEmployees";
import { SendInviteButton } from "@/src/modules/employees/components/SendInviteButton";
import { DeleteEmployeeButton } from "@/src/modules/employees/components/DeleteEmployeeButton";

type EmployeeCardProps = {
  currentUserId: string | null;
  employee: AdminEmployeeRecord;
  access: ResolvedRoleAccess["employees"];
};

function getRoleLabel(role: string | null) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Без роли";
}

function getStatusLabel(status: string | null) {
  if (status === "invited") return "Invited";
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "archived") return "Archived";
  return "Без статуса";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function EmployeeCard({ currentUserId,
  employee,
  access,
}: EmployeeCardProps) {
  const isSuperadminTarget = employee.role === "superadmin";
  const isMyEmployee =
    employee.invitedBy && employee.invitedBy === currentUserId;


  const canSendInvite =
    employee.status === "invited" &&
    (isSuperadminTarget ? access.editSuperadmin : access.resendInvite) &&
    (access.editSuperadmin || isMyEmployee);

  const canDeleteEmployee =
    (isSuperadminTarget
      ? access.deleteSuperadmin
      : access.delete) &&
    (access.deleteSuperadmin || isMyEmployee);

  const employeeLabel = employee.fullName ?? employee.email ?? "Сотрудник";

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {employeeLabel}
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            {employee.email ?? "Email появится после активации профиля"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {employee.jobTitle ?? "Должность пока не указана"}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
            {getRoleLabel(employee.role)}
          </span>

          <span className="inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
            {getStatusLabel(employee.status)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Создан
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {formatDate(employee.createdAt)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Инвайт
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {formatDate(employee.lastInviteSentAt ?? employee.invitedAt)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Активация
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {formatDate(employee.activatedAt)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Состояние
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {employee.isActive ? "В рабочем списке" : "Отключен"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {canSendInvite ? (
            <SendInviteButton membershipId={employee.membershipId} />
          ) : null}
        </div>

        {canDeleteEmployee ? (
          <DeleteEmployeeButton
            membershipId={employee.membershipId}
            employeeLabel={employeeLabel}
            variant="full"
          />
        ) : null}
      </div>
    </article>
  );
}
