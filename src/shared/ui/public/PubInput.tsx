"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubInput.tsx
// Крупне поле вводу публічки (h≥48px). Focus → акцент району + ring.
// invalid → рамка danger. Підтримує left/right іконки.
// ════════════════════════════════════════════════════════════════════════
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./pubStyles";

export type PubInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export const PubInput = forwardRef<HTMLInputElement, PubInputProps>(
  function PubInput({ invalid = false, leftIcon, rightIcon, className, ...rest }, ref) {
    const field = (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(
          "h-12 w-full rounded-[var(--r-lg)] bg-[var(--pub-surface-elevated)] text-[15px] text-[var(--pub-text)]",
          "placeholder:text-[var(--pub-text-soft)] outline-none transition-shadow duration-150",
          leftIcon ? "pl-11" : "pl-4",
          rightIcon ? "pr-11" : "pr-4",
          invalid
            ? "border-2 border-[var(--pub-danger-border)] focus:shadow-[0_0_0_3px_var(--pub-danger-bg)]"
            : "border border-[var(--pub-border-strong)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]",
          className,
        )}
        {...rest}
      />
    );

    if (!leftIcon && !rightIcon) return field;

    return (
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pub-text-soft)]">
            {leftIcon}
          </span>
        ) : null}
        {field}
        {rightIcon ? (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--pub-text-soft)]">
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
