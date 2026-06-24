import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type KanbanStatusTone = "info" | "warning" | "success" | "neutral";

const DOT: Record<KanbanStatusTone, string> = {
  info: "bg-[var(--cms-info-text)]",
  warning: "bg-[var(--cms-warning-text)]",
  success: "bg-[var(--cms-success-text)]",
  neutral: "bg-[var(--cms-text-soft)]",
};

export type KanbanColumnProps = {
  title: string;
  tone?: KanbanStatusTone;
  count?: number;
  isOver?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export const KanbanColumn = React.forwardRef<HTMLDivElement, KanbanColumnProps>(function KanbanColumn(
  { title, tone = "neutral", count, isOver, children, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx(
        "flex min-h-[240px] flex-col gap-3 rounded-[var(--r-xl)] border bg-[var(--cms-surface-muted)] p-3.5 shadow-[var(--cms-shadow-sm)] transition-[background-color,border-color,box-shadow]",
        isOver
          ? "border-[var(--cms-accent-primary)] bg-[color-mix(in_srgb,var(--cms-accent-primary)_8%,var(--cms-surface-muted))] shadow-[var(--cms-shadow-md)]"
          : "border-[var(--cms-border)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2">
        <span className={cx("h-[9px] w-[9px] rounded-[var(--r-pill)]", DOT[tone])} aria-hidden="true" />
        <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--cms-text)]">
          {title}
        </span>
        {typeof count === "number" ? (
          <span className="ml-auto rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] px-2 py-px text-xs font-semibold text-[var(--cms-text-soft)]">
            {count}
          </span>
        ) : null}
      </div>

      {children}
    </div>
  );
});

export type KanbanCardProps = {
  dragging?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { dragging, children, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx(
        "rounded-[var(--r-lg)] border bg-[var(--cms-surface)] p-3.5 transition-[background-color,border-color,box-shadow,opacity]",
        dragging
          ? "border-[var(--cms-accent-primary)] shadow-[var(--cms-shadow-md)]"
          : "border-[var(--cms-border)] shadow-[var(--cms-shadow-sm)] hover:border-[var(--cms-border-strong)]",
        className,
      )}
    >
      {children}
    </div>
  );
});
