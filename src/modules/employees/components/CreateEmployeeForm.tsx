"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createEmployee } from "@/src/modules/employees/actions/createEmployee";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

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

  const flash = state.success
    ? { type: "success" as const, message: state.success }
    : state.error
      ? { type: "error" as const, message: state.error }
      : null;

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
          <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
            Сотрудники
          </div>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Реестр сотрудников
          </h2>
        </div>

        {canCreateEmployees ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            {shouldShowForm ? "Скрыть форму" : "Создать сотрудника"}
          </button>
        ) : null}
      </div>

      {flash ? (
        <div
          id={flash.type === "success" ? "employee-create-success" : undefined}
          className={
            flash.type === "success"
              ? "rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
              : "rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
          }
        >
          {flash.message}
        </div>
      ) : null}

      {shouldShowForm ? (
        <form
          ref={formRef}
          action={handleSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
            Новый сотрудник
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Создать профиль сотрудника
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Новый сотрудник всегда создается в статусе Invited. Активным он станет
            только после завершения регистрации по инвайту.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Имя сотрудника
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Например, Анна Коваль"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="employee@company.ua"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Должность
              </label>
              <input
                type="text"
                name="jobTitle"
                placeholder="Например, Контент-менеджер"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Роль
              </label>
              <select
                name="role"
                defaultValue={ROLES.MANAGER}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-400"
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
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
            >
              {isPending ? "Создаем..." : "Создать сотрудника"}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Отмена
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
