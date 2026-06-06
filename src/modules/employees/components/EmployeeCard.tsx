"use client";

import { useState } from "react";
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

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .98 1.7 1.7 0 0 1-3.24 0A1.7 1.7 0 0 0 9.76 19a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.98-1 1.7 1.7 0 0 1 0-3.24A1.7 1.7 0 0 0 4.6 9.76a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.98 1.7 1.7 0 0 1 3.24 0A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .41.16.8.46 1.09.29.29.68.46 1.09.46a1.7 1.7 0 0 1 0 3.24A1.7 1.7 0 0 0 19.4 15z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-[var(--cms-text)]">
        {value}
      </div>
    </div>
  );
}

export function EmployeeCard({
  currentUserId,
  employee,
  access,
}: EmployeeCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    <>
      <article className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[var(--cms-text)]">
              {employeeLabel}
            </h3>

            <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
              {employee.email ?? "Email з’явиться після активації профілю"}
            </p>

            <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
              {employee.jobTitle ?? "Посада поки не вказана"}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
              {getRoleLabel(employee.role)}
            </span>

            <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
              {getStatusLabel(employee.status)}
            </span>

            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-bg-tertiary)] hover:text-[var(--cms-text)]"
              aria-label={`Налаштування співробітника ${employeeLabel}`}
              title="Налаштування"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="Створено" value={formatDate(employee.createdAt)} />
          <DetailCard
            label="Запрошення"
            value={formatDate(employee.lastInviteSentAt ?? employee.invitedAt)}
          />
          <DetailCard label="Активація" value={formatDate(employee.activatedAt)} />
          <DetailCard
            label="Стан"
            value={employee.isActive ? "У робочому списку" : "Вимкнено"}
          />
        </div>
      </article>

      {isDetailsOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(2,6,23,0.6)] backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsDetailsOpen(false)}
            aria-label="Закрити панель співробітника"
          />

          <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--cms-border-primary)] px-6 py-6">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
                  Співробітник
                </div>

                <h2 className="mt-2 text-2xl font-semibold text-[var(--cms-text)]">
                  {employeeLabel}
                </h2>

                <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                  {employee.email ?? "Email з’явиться після активації профілю"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-bg-tertiary)] hover:text-[var(--cms-text)]"
                aria-label="Закрити панель"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 px-6 py-6">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                  {getRoleLabel(employee.role)}
                </span>

                <span className="inline-flex rounded-full border border-[var(--cms-border-primary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                  {getStatusLabel(employee.status)}
                </span>
              </div>

              <div className="grid gap-3">
                <DetailCard label="Посада" value={employee.jobTitle ?? "Посада поки не вказана"} />
                <DetailCard label="Створено" value={formatDate(employee.createdAt)} />
                <DetailCard
                  label="Запрошення"
                  value={formatDate(employee.lastInviteSentAt ?? employee.invitedAt)}
                />
                <DetailCard label="Активація" value={formatDate(employee.activatedAt)} />
                <DetailCard
                  label="Стан"
                  value={employee.isActive ? "У робочому списку" : "Вимкнено"}
                />
              </div>

              <div className="mt-auto space-y-3 border-t border-[var(--cms-border-primary)] pt-5">
                {canSendInvite ? (
                  <SendInviteButton membershipId={employee.membershipId} />
                ) : null}

                {canDeleteEmployee ? (
                  <DeleteEmployeeButton
                    membershipId={employee.membershipId}
                    employeeLabel={employeeLabel}
                    variant="full"
                  />
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
