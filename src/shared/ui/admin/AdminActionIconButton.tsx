import Link from "next/link";
import * as React from "react";
import { AdminInlineIcon, type AdminActionIconName } from "../icons/AdminInlineIcons";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type CommonActionIconProps = {
  icon: AdminActionIconName;
  label: string;
  tooltip?: string;
  selected?: boolean;
  tone?: "neutral" | "accent" | "danger";
  size?: "sm" | "md" | "lg";
};

export type AdminActionIconButtonProps = CommonActionIconProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export type AdminActionIconLinkProps = CommonActionIconProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

const BOX: Record<NonNullable<CommonActionIconProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-[var(--r-lg)]",
  md: "h-11 w-11 rounded-[var(--r-lg)]",
  lg: "h-14 w-14 rounded-[var(--r-xl)]",
};

const ICON: Record<NonNullable<CommonActionIconProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const TONE_DEFAULT: Record<NonNullable<CommonActionIconProps["tone"]>, string> = {
  neutral:
    "border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)] hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-accent-primary)]",
  accent:
    "border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-accent-primary)] hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-pill-bg)]",
  danger:
    "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:brightness-[1.06]",
};

const TONE_SELECTED =
  "border-[var(--cms-accent-primary)] bg-[color-mix(in_srgb,var(--cms-accent-primary)_16%,transparent)] text-[var(--cms-accent-primary)]";

function actionIconClass({
  size,
  tone,
  selected,
  className,
}: {
  size: NonNullable<CommonActionIconProps["size"]>;
  tone: NonNullable<CommonActionIconProps["tone"]>;
  selected: boolean;
  className?: string;
}) {
  return cx(
    "inline-flex items-center justify-center border transition-[color,background-color,border-color,filter]",
    "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]",
    "disabled:pointer-events-none disabled:opacity-55",
    BOX[size],
    selected ? TONE_SELECTED : TONE_DEFAULT[tone],
    className,
  );
}

export const AdminActionIconButton = React.forwardRef<HTMLButtonElement, AdminActionIconButtonProps>(
  function AdminActionIconButton(
    {
      icon,
      label,
      tooltip,
      selected = false,
      tone = "neutral",
      size = "md",
      className,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={selected || undefined}
        title={tooltip ?? label}
        className={actionIconClass({ size, tone, selected, className })}
        {...rest}
      >
        <AdminInlineIcon name={icon} className={ICON[size]} />
      </button>
    );
  },
);

export function AdminActionIconLink({
  icon,
  label,
  tooltip,
  selected = false,
  tone = "neutral",
  size = "md",
  className,
  href,
  ...rest
}: AdminActionIconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={selected ? "page" : undefined}
      title={tooltip ?? label}
      className={actionIconClass({ size, tone, selected, className })}
      {...rest}
    >
      <AdminInlineIcon name={icon} className={ICON[size]} />
    </Link>
  );
}
