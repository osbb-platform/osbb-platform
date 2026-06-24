"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestAdminPasswordReset } from "@/src/modules/auth/actions/requestAdminPasswordReset";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

const initialState = {
  error: null,
  success: null,
};

export function AdminForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestAdminPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-[var(--cms-text)]"
        >
          Електронна пошта
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@company.ua"
          className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
          autoComplete="off"
        />
      </div>

      {state.error ? (
        <div role="alert" className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div role="status" className="rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {state.success}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-[var(--r-lg)] bg-[var(--cms-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-primary-contrast)] transition hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Надсилаємо..." : "Надіслати посилання"}
        </button>

        <Link
          href={ROUTES.admin.login}
          className="text-sm font-medium text-[var(--cms-text-muted)] transition hover:text-[var(--cms-text)]"
        >
          Повернутися до входу
        </Link>
      </div>
    </form>
  );
}
