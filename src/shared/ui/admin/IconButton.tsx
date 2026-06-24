import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type AdminIconButtonVariant = "ghost" | "subtle" | "danger";
export type AdminIconButtonSize = "sm" | "md";

export type IconButtonProps = {
  variant?: AdminIconButtonVariant;
  size?: AdminIconButtonSize;
  "aria-label": string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const FOCUS =
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]";

const VARIANT: Record<AdminIconButtonVariant, string> = {
  ghost:
    "border border-transparent bg-transparent text-[var(--cms-text-muted)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]",
  subtle:
    "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)] hover:border-[var(--cms-border-strong)]",
  danger:
    "border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:brightness-[1.06]",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center rounded-[var(--r-md)] transition-[background-color,border-color,filter]",
        size === "sm" ? "h-9 w-9" : "h-10 w-10",
        VARIANT[variant],
        FOCUS,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
