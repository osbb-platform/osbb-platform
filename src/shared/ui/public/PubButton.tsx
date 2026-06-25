"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubButton.tsx
// Преміум-кнопка публічки. Тач-таргети крупніші за адмінку (44/48/52px).
// Варіанти: primary (акцент району) · secondary · ghost · accent-soft.
// ════════════════════════════════════════════════════════════════════════
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, PUB_FOCUS_RING } from "./pubStyles";

export type PubButtonVariant = "primary" | "secondary" | "ghost" | "accent-soft";
export type PubButtonSize = "sm" | "md" | "lg";

export type PubButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PubButtonVariant;
  size?: PubButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const SIZE: Record<PubButtonSize, string> = {
  sm: "h-11 px-5 text-sm gap-2", // 44px — мінімальний тач-таргет
  md: "h-12 px-6 text-[15px] gap-2.5", // 48px
  lg: "h-[52px] px-7 text-base gap-2.5", // 52px — CTA
};

const VARIANT: Record<PubButtonVariant, string> = {
  primary:
    "bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] hover:brightness-[1.04] active:brightness-95",
  secondary:
    "bg-transparent text-[var(--pub-text)] border border-[var(--pub-border-strong)] hover:bg-[var(--pub-bg-quiet)]",
  ghost:
    "bg-transparent text-[var(--pub-accent-strong)] hover:bg-[var(--pub-accent-tint)]",
  "accent-soft":
    "bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)] border border-[var(--pub-accent-border)] hover:brightness-[1.03]",
};

function Spinner() {
  return (
    <svg
      className="h-[18px] w-[18px] animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export const PubButton = forwardRef<HTMLButtonElement, PubButtonProps>(
  function PubButton(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cx(
          "inline-flex items-center justify-center rounded-[var(--r-pill)] font-semibold leading-none",
          "transition-[filter,background-color,transform] duration-200 select-none",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100",
          SIZE[size],
          VARIANT[variant],
          fullWidth && "w-full",
          PUB_FOCUS_RING,
          className,
        )}
        {...rest}
      >
        {loading ? <Spinner /> : leftIcon ? <span className="-ml-0.5 inline-flex">{leftIcon}</span> : null}
        {children}
        {!loading && rightIcon ? <span className="-mr-0.5 inline-flex">{rightIcon}</span> : null}
      </button>
    );
  },
);
