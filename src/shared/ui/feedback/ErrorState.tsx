"use client";

import Link from "next/link";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHome?: boolean;
};

export function ErrorState({
  title = "Щось пішло не так",
  description = "Не вдалося завантажити сторінку. Спробуйте оновити її або поверніться пізніше.",
  onRetry,
  showHome = false,
}: ErrorStateProps) {
  return (
    <section className="flex min-h-[360px] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-8 text-center text-[var(--cms-text)] shadow-[0_24px_80px_rgba(2,6,23,0.14)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--cms-border-strong,var(--cms-border))] bg-[var(--cms-surface-elevated,var(--cms-surface))] text-2xl font-semibold">
          !
        </div>

        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--cms-text)]">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--cms-text-muted)]">
          {description}
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-strong,var(--cms-border))] bg-[var(--cms-text)] px-5 py-3 text-sm font-medium text-[var(--cms-surface)] transition hover:opacity-90"
            >
              Спробувати ще раз
            </button>
          ) : null}

          {showHome ? (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-strong,var(--cms-border))] px-5 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted,var(--cms-surface-elevated,var(--cms-surface)))]"
            >
              На головну
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
