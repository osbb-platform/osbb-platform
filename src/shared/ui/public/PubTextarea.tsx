"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubTextarea.tsx
// ════════════════════════════════════════════════════════════════════════
import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cx } from "./pubStyles";

export type PubTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const PubTextarea = forwardRef<HTMLTextAreaElement, PubTextareaProps>(
  function PubTextarea({ invalid = false, rows = 4, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cx(
          "w-full rounded-[var(--r-lg)] bg-[var(--pub-surface-elevated)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--pub-text)]",
          "placeholder:text-[var(--pub-text-soft)] outline-none transition-shadow duration-150 resize-y",
          invalid
            ? "border-2 border-[var(--pub-danger-border)] focus:shadow-[0_0_0_3px_var(--pub-danger-bg)]"
            : "border border-[var(--pub-border-strong)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]",
          className,
        )}
        {...rest}
      />
    );
  },
);
