"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createEmployee } from "@/src/modules/employees/actions/createEmployee";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import {
  adminPrimaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

const initialState = {
  error: null,
  success: null,
};

type CreateEmployeeFormProps = {
  currentRole: string | null;
};

type CreateEmployeeActionFormProps = {
  currentRole: string | null;
  onHandled: () => void;
};

function CreateEmployeeActionForm({
  currentRole,
  onHandled,
}: CreateEmployeeActionFormProps) {
  const [state, formAction, isPending] = useActionState(
    createEmployee,
    initialState,
  );
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const canCreateAdmins = currentRole === ROLES.SUPERADMIN;
  const canCreateEmployees =
    currentRole === ROLES.SUPERADMIN || currentRole === ROLES.ADMIN;

  const flash = useMemo(() => {
    return state.success
      ? { type: "success" as const, message: state.success }
      : state.error
        ? { type: "error" as const, message: state.error }
        : null;
  }, [state.success, state.error]);

  useEffect(() => {
    if (!flash) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onHandled();
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [flash, onHandled]);

  async function handleSubmit(formData: FormData) {
    await formAction(formData);

    requestAnimationFrame(() => {
      const successBanner = document.getElementById("employee-create-success");
      if (successBanner?.textContent?.trim()) {
        formRef.current?.reset();
      }
    });
  }

  const shouldShowForm = canCreateEmployees && isOpen && !state.success;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
            Співробітники
          </div>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
            Реєстр співробітників
          </h2>
        </div>

        {canCreateEmployees ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={adminPrimaryButtonClass}
          >
            {shouldShowForm ? "Сховати форму" : "Створити співробітника"}
          </button>
        ) : null}
      </div>

      {flash ? (
        <div
          id={flash.type === "success" ? "employee-create-success" : undefined}
          className={
            flash.type === "success"
              ? "rounded-2xl border px-4 py-3 text-sm border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]"
              : "rounded-2xl border px-4 py-3 text-sm border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]"
          }
        >
          {flash.message}
        </div>
      ) : null}

      {shouldShowForm ? (
        <form
          ref={formRef}
          action={handleSubmit}
          className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6"
        >
          <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
            Новий співробітник
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
            Створити профіль співробітника
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--cms-text-secondary)]">
            Новий співробітник завжди створюється у статусі «Запрошення надіслано». Активним він стане
            лише після завершення реєстрації за запрошенням.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
                Ім’я співробітника
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Наприклад, Анна Коваль"
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="employee@company.ua"
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
                Посада
              </label>
              <input
                type="text"
                name="jobTitle"
                placeholder="Наприклад, Контент-менеджер"
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
                Роль
              </label>
              <select
                name="role"
                defaultValue={ROLES.MANAGER}
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                {canCreateAdmins ? (
                  <option value={ROLES.ADMIN}>Admin</option>
                ) : null}
                <option value={ROLES.MANAGER}>Manager</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className={`${adminPrimaryButtonClass} disabled:opacity-60`}
            >
              {isPending ? "Створюємо..." : "Створити співробітника"}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-secondary)] hover:text-[var(--cms-text-primary)]"
            >
              Скасувати
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export function CreateEmployeeForm({
  currentRole,
}: CreateEmployeeFormProps) {
  const [actionKey, setActionKey] = useState(0);

  return (
    <CreateEmployeeActionForm
      key={actionKey}
      currentRole={currentRole}
      onHandled={() => setActionKey((value) => value + 1)}
    />
  );
}
