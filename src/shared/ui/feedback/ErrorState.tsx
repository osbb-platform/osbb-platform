"use client";

import Link from "next/link";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHome?: boolean;
};

const focusRingClass =
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring,var(--company-primary))_35%,transparent)]";

const primaryActionClass = [
  "inline-flex h-11 items-center justify-center rounded-[var(--r-lg,14px)] px-5 text-sm font-semibold transition-[filter,transform]",
  "border border-transparent bg-[var(--cms-primary,var(--foreground))] text-[var(--cms-primary-contrast,var(--background))]",
  "hover:brightness-[1.04] active:translate-y-px",
  focusRingClass,
].join(" ");

const secondaryActionClass = [
  "inline-flex h-11 items-center justify-center rounded-[var(--r-lg,14px)] px-5 text-sm font-semibold transition-colors",
  "border border-[var(--cms-border-strong,var(--border))] text-[var(--cms-text,var(--foreground))]",
  "hover:bg-[var(--cms-surface-muted,var(--card))]",
  focusRingClass,
].join(" ");

export function ErrorState({
  title = "Щось пішло не так",
  description = "Не вдалося завантажити сторінку. Спробуйте оновити її або поверніться пізніше.",
  onRetry,
  showHome = false,
}: ErrorStateProps) {
  return (
    <section className="flex min-h-[360px] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-[var(--r-2xl,22px)] border border-[var(--cms-border,var(--border))] bg-[var(--cms-surface,var(--card))] p-8 text-center text-[var(--cms-text,var(--foreground))] shadow-[var(--cms-shadow-lg,0_24px_64px_rgba(0,0,0,0.12))]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--r-lg,14px)] border border-[var(--cms-danger-border,var(--border))] bg-[var(--cms-danger-bg,var(--card))] text-2xl font-semibold text-[var(--cms-danger-text,var(--company-secondary))]">
          !
        </div>

        <h1 className="font-[family-name:var(--font-serif,var(--font-sans))] text-2xl font-semibold tracking-[-0.02em] text-[var(--cms-text,var(--foreground))]">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--cms-text-muted,var(--muted))]">
          {description}
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={primaryActionClass}
            >
              Спробувати ще раз
            </button>
          ) : null}

          {showHome ? (
            <Link href="/" className={secondaryActionClass}>
              На головну
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
