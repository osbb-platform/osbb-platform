import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  | "danger"
  | "success"
  | "warning";

export type AdminButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const FOCUS =
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]";

const BASE = cx(
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none",
  "rounded-[var(--r-lg)] transition-[background-color,border-color,filter,transform] duration-150",
  "active:translate-y-px disabled:opacity-60 disabled:pointer-events-none",
  FOCUS
);

const SIZE: Record<AdminButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const VARIANT: Record<AdminButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--cms-primary)] text-[var(--cms-primary-contrast)] hover:bg-[var(--cms-accent-strong)]",
  secondary:
    "border border-[var(--cms-border-strong)] bg-transparent text-[var(--cms-text)] hover:bg-[var(--cms-pill-bg)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--cms-text-muted)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]",
  subtle:
    "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)] hover:border-[var(--cms-border-strong)]",
  danger:
    "border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:brightness-[1.06]",
  success:
    "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)] hover:brightness-[1.06]",
  warning:
    "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)] hover:brightness-[1.06]",
};

function InlineSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    iconLeft,
    iconRight,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(BASE, SIZE[size], VARIANT[variant], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className="absolute left-0 right-0 flex items-center justify-start pl-4">
          <InlineSpinner />
        </span>
      )}
      <span className={cx("inline-flex items-center gap-2", loading && "opacity-0")}>
        {iconLeft}
        {children}
        {iconRight}
      </span>
    </button>
  );
});
