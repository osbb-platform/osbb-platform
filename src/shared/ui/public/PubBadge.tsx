// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubBadge.tsx
// Семантичний бейдж публічки (тони success/danger/warning/info/accent/neutral).
// ════════════════════════════════════════════════════════════════════════
import type { HTMLAttributes, ReactNode } from "react";
import { cx, pubToneClass, type PubTone } from "./pubStyles";

export type PubBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: PubTone;
  size?: "sm" | "md";
  withDot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

const SIZE = {
  sm: "h-7 px-3 text-[11px] gap-1.5",
  md: "h-8 px-3.5 text-[13px] gap-2",
} as const;

export function PubBadge({
  tone = "neutral",
  size = "md",
  withDot = false,
  icon,
  className,
  children,
  ...rest
}: PubBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-[var(--r-pill)] border font-semibold leading-none whitespace-nowrap",
        SIZE[size],
        pubToneClass[tone],
        className,
      )}
      {...rest}
    >
      {withDot ? (
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" aria-hidden="true" />
      ) : null}
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}
