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
          className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]"
        >
          Електронна пошта
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@company.ua"
          className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
          autoComplete="off"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {state.success}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {isPending ? "Надсилаємо..." : "Надіслати посилання"}
        </button>

        <Link
          href={ROUTES.admin.login}
          className="text-sm font-medium text-[var(--cms-text-secondary)] transition hover:text-[var(--cms-text-primary)]"
        >
          Повернутися до входу
        </Link>
      </div>
    </form>
  );
}
