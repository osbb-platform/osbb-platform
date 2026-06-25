"use client";

import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type HouseEntityBadgeVariant = "slug" | "managementCompany";

export type HouseEntityBadgeProps = {
  variant: HouseEntityBadgeVariant;
  children: React.ReactNode;
  title?: string;
  className?: string;
  icon?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
};

function SlugIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px] flex-none text-[var(--cms-text-soft)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}

function CompanyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px] flex-none text-[var(--cms-text-soft)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-3" />
      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
  );
}

const BASE =
  "inline-flex h-10 max-w-full items-center gap-2 rounded-[var(--r-pill)] px-4 text-sm";

const VARIANT: Record<HouseEntityBadgeVariant, string> = {
  slug:
    "border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] font-medium tracking-[-0.01em] text-[var(--cms-text-muted)]",
  managementCompany:
    "border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] font-medium text-[var(--cms-text)]",
};

export function HouseEntityBadge({
  variant,
  children,
  title,
  className,
  icon = true,
  copyable = false,
  onCopy,
}: HouseEntityBadgeProps) {
  return (
    <span title={title} className={cx(BASE, VARIANT[variant], className)}>
      {icon && (variant === "slug" ? <SlugIcon /> : <CompanyIcon />)}
      <span className="truncate">{children}</span>
      {copyable ? (
        <button
          type="button"
          aria-label="Скопіювати"
          onClick={onCopy}
          className="ml-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[var(--cms-text-soft)] transition-colors hover:bg-[var(--cms-border-strong)] hover:text-[var(--cms-text)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}
