"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubSelect.tsx
// Нативний <select> із власною стрілкою (тема-агностична, currentColor).
// ════════════════════════════════════════════════════════════════════════
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cx } from "./pubStyles";

export type PubSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const PubSelect = forwardRef<HTMLSelectElement, PubSelectProps>(
  function PubSelect({ invalid = false, className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cx(
            "h-12 w-full cursor-pointer appearance-none rounded-[var(--r-lg)] bg-[var(--pub-surface-elevated)] pl-4 pr-11 text-[15px] text-[var(--pub-text)]",
            "outline-none transition-shadow duration-150",
            invalid
              ? "border-2 border-[var(--pub-danger-border)] focus:shadow-[0_0_0_3px_var(--pub-danger-bg)]"
              : "border border-[var(--pub-border-strong)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--pub-text-soft)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    );
  },
);
