import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-2 rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-7 py-9 text-center shadow-[var(--cms-shadow-sm)]",
        className
      )}
    >
      {icon && (
        <div className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-[var(--r-lg)] bg-[var(--cms-pill-bg)] text-[var(--cms-accent-primary)]">
          {icon}
        </div>
      )}
      <h3 className="m-0 font-[family-name:var(--font-serif)] text-[20px] font-semibold text-[var(--cms-text)]">{title}</h3>
      {description && <p className="m-0 max-w-[34ch] text-[13px] leading-[1.6] text-[var(--cms-text-muted)]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
