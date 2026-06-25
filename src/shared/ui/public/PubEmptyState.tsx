// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubEmptyState.tsx
// Дружній порожній / помилковий стан із CTA. tone="error" → danger-поверхня.
// ════════════════════════════════════════════════════════════════════════
import type { ReactNode } from "react";
import { cx } from "./pubStyles";

export type PubEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "error";
  className?: string;
};

export function PubEmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
  className,
}: PubEmptyStateProps) {
  const isError = tone === "error";

  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-[var(--r-2xl)] border px-6 py-10 text-center",
        isError
          ? "border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)]"
          : "border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-sm)]",
        className,
      )}
    >
      {icon ? (
        <span
          className={cx(
            "flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)]",
            isError
              ? "bg-[color-mix(in_srgb,var(--pub-danger-text)_16%,transparent)] text-[var(--pub-danger-text)]"
              : "bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)]",
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="mt-3 text-[15px] font-semibold text-[var(--pub-text)]">{title}</div>
      {description ? (
        <div className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--pub-text-muted)]">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
