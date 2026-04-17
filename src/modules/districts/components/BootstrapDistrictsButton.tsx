"use client";

import { useActionState } from "react";
import { bootstrapDefaultDistricts } from "@/src/modules/districts/actions/bootstrapDefaultDistricts";

const initialState = {
  error: null,
  success: null,
};

export function BootstrapDistrictsButton() {
  const [state, formAction, isPending] = useActionState(
    bootstrapDefaultDistricts,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-sm font-medium text-white">
          Быстрое создание базовых районов
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-400">
          Система создаст 7 районов заказчика с готовыми slug и цветами. Уже
          существующие районы будут пропущены без дублей.
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {isPending ? "Создаем районы..." : "Создать 7 районов заказчика"}
      </button>
    </form>
  );
}
