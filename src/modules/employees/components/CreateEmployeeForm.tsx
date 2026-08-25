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

type CityOption = {
  id: string;
  name: string;
  slug: string;
};

type CreateEmployeeFormProps = {
  currentRole: string | null;
  cities: CityOption[];
  activeCityId: string | null;
};

type CreateEmployeeActionFormProps = {
  currentRole: string | null;
  cities: CityOption[];
  activeCityId: string | null;
  onHandled: () => void;
};

function CreateEmployeeActionForm({
  currentRole,
  cities,
  activeCityId,
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--cms-text)]">
            Реєстр співробітників
          </h1>
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
              ? "rounded-[var(--r-lg)] border px-4 py-3 text-sm border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]"
              : "rounded-[var(--r-lg)] border px-4 py-3 text-sm border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]"
          }
        >
          {flash.message}
        </div>
      ) : null}

      {shouldShowForm ? (
        <form
          ref={formRef}
          action={handleSubmit}
          className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
        >
          <div className="inline-flex rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
            Новий співробітник
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--cms-text)]">
            Створити профіль співробітника
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--cms-text-muted)]">
            Новий співробітник завжди створюється у статусі «Запрошення надіслано». Активним він стане
            лише після завершення реєстрації за запрошенням.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                Ім’я співробітника
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Наприклад, Анна Коваль"
                className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="employee@company.ua"
                className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                Посада
              </label>
              <input
                type="text"
                name="jobTitle"
                placeholder="Наприклад, Контент-менеджер"
                className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                Місто
              </label>
              <select
                name="cityId"
                defaultValue={activeCityId ?? cities[0]?.id ?? ""}
                disabled={currentRole !== ROLES.SUPERADMIN}
                className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {currentRole !== ROLES.SUPERADMIN ? (
                <input type="hidden" name="cityId" value={activeCityId ?? ""} />
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                Роль
              </label>
              <select
                name="role"
                defaultValue={ROLES.CONTENT_MANAGER}
                className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
              >
                {canCreateAdmins ? (
                  <option value={ROLES.ADMIN}>Admin</option>
                ) : null}
                <option value={ROLES.MANAGER}>Manager</option>
                <option value={ROLES.CONTENT_MANAGER}>Контент-менеджер</option>
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
              className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border)] px-5 py-3 text-sm font-medium text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-surface-muted)] hover:text-[var(--cms-text)]"
            >
              Скасувати
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function CreateEmployeeForm({
  currentRole,
  cities,
  activeCityId,
}: CreateEmployeeFormProps) {
  const [actionKey, setActionKey] = useState(0);

  return (
    <CreateEmployeeActionForm
      key={actionKey}
      currentRole={currentRole}
      cities={cities}
      activeCityId={activeCityId}
      onHandled={() => setActionKey((value) => value + 1)}
    />
  );
}
