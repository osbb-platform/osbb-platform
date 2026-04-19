"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdmin } from "@/src/modules/auth/actions/loginAdmin";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

const initialState = {
  error: null,
};

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAdmin,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6 text-center">
      <div className="text-left">
        <label
          htmlFor="email"
          className="mb-2 block text-base font-medium text-slate-200"
        >
          Електронна пошта
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@company.ua"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-lg text-white outline-none transition focus:border-slate-400"
          autoComplete="off"
        />
      </div>

      <div className="text-left">
        <label
          htmlFor="password"
          className="mb-2 block text-base font-medium text-slate-200"
        >
          Пароль
        </label>

        <input
          id="password"
          name="password"
          type="password"
          placeholder="Введіть пароль"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-lg text-white outline-none transition focus:border-slate-400"
          autoComplete="new-password"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300 text-left">
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-col items-center pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-white px-6 py-4 text-lg font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {isPending ? "Входимо..." : "Увійти"}
        </button>

        <Link
          href={ROUTES.admin.forgotPassword}
          className="mt-3 text-base font-medium text-slate-400 transition hover:text-white"
        >
          Забули пароль?
        </Link>
      </div>
    </form>
  );
}
