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
      <div className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
        <div className="text-sm font-medium text-[var(--cms-text)]">
          Швидке створення базових районів
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
          Система створить 7 районів замовника з готовими slug і кольорами. Уже
          існуючі райони будуть пропущені без дублів.
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-2xl bg-[var(--cms-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-primary-foreground)] transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Створюємо райони..." : "Створити 7 районів замовника"}
      </button>
    </form>
  );
}
