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
  return "Без ролі";
}

function getStatusLabel(status: string | null) {
  if (status === "invited") return "Запрошено";
  if (status === "active") return "Активний";
  if (status === "inactive") return "Неактивний";
  if (status === "archived") return "Архівний";
  return "Без статусу";
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

  const employeeLabel = employee.fullName ?? employee.email ?? "Співробітник";

  return (
    <article className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--cms-text-primary)]">
            {employeeLabel}
          </h3>

          <p className="mt-1 text-sm text-[var(--cms-text-secondary)]">
            {employee.email ?? "Email з’явиться після активації профілю"}
          </p>

          <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
            {employee.jobTitle ?? "Посада поки не вказана"}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
            {getRoleLabel(employee.role)}
          </span>

          <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
            {getStatusLabel(employee.status)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Створено
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--cms-text-primary)]">
            {formatDate(employee.createdAt)}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Запрошення
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--cms-text-primary)]">
            {formatDate(employee.lastInviteSentAt ?? employee.invitedAt)}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Активація
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--cms-text-primary)]">
            {formatDate(employee.activatedAt)}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Стан
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--cms-text-primary)]">
            {employee.isActive ? "У робочому списку" : "Вимкнено"}
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
