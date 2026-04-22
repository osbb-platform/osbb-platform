import { adminBadgeBaseClass } from "@/src/shared/ui/admin/adminStyles";

type AdminStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type AdminStatusBadgeProps = {
  tone?: AdminStatusTone;
  children: React.ReactNode;
  className?: string;
};

function getToneClass(tone: AdminStatusTone) {
  if (tone === "success") {
    return "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  }

  if (tone === "warning") {
    return "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]";
  }

  if (tone === "danger") {
    return "border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]";
  }

  if (tone === "info") {
    return "border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] text-[var(--cms-pill-text)]";
  }

  return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text-muted)]";
}

export function AdminStatusBadge({
  tone = "neutral",
  children,
  className = "",
}: AdminStatusBadgeProps) {
  return (
    <span
      className={[adminBadgeBaseClass, getToneClass(tone), className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
