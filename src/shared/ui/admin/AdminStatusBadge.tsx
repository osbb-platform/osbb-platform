import type { ReactNode } from "react";

import { adminBadgeBaseClass } from "@/src/shared/ui/admin/adminStyles";

export type AdminStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type AdminStatusBadgeProps = {
  tone?: AdminStatusTone;
  children: ReactNode;
  className?: string;
  withDot?: boolean;
};

const toneClass: Record<AdminStatusTone, string> = {
  success:
    "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
  warning:
    "border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]",
  danger:
    "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
  info:
    "border-[var(--cms-info-border)] bg-[var(--cms-info-bg)] text-[var(--cms-info-text)]",
  neutral:
    "border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text-muted)]",
};

const dotClass: Record<AdminStatusTone, string> = {
  success: "bg-[var(--cms-success-text)]",
  warning: "bg-[var(--cms-warning-text)]",
  danger: "bg-[var(--cms-danger-text)]",
  info: "bg-[var(--cms-info-text)]",
  neutral: "bg-[var(--cms-text-soft)]",
};

export function statusToneFor(status: string | null | undefined): AdminStatusTone {
  const value = String(status ?? "").trim().toLowerCase();

  if (
    [
      "active",
      "published",
      "publish",
      "completed",
      "complete",
      "done",
      "approved",
      "success",
    ].includes(value)
  ) {
    return "success";
  }

  if (
    [
      "draft",
      "scheduled",
      "pending",
      "review",
      "in_review",
      "in-progress",
      "in_progress",
      "warning",
    ].includes(value)
  ) {
    return "warning";
  }

  if (
    [
      "archived",
      "archive",
      "deleted",
      "cancelled",
      "canceled",
      "failed",
      "error",
      "overdue",
    ].includes(value)
  ) {
    return "danger";
  }

  if (["planned", "new", "created", "info"].includes(value)) {
    return "info";
  }

  return "neutral";
}

export function AdminStatusBadge({
  tone = "neutral",
  children,
  className = "",
  withDot = true,
}: AdminStatusBadgeProps) {
  return (
    <span
      className={[
        adminBadgeBaseClass,
        "min-h-[26px] align-middle",
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {withDot ? (
        <span
          className={["h-1.5 w-1.5 shrink-0 rounded-full", dotClass[tone]].join(" ")}
          aria-hidden="true"
        />
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
