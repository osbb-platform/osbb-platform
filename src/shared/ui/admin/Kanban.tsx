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
  ref
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx(
        "flex flex-col gap-3 rounded-[var(--r-lg)] border bg-[var(--cms-surface-muted)] p-3.5 transition-colors",
        isOver ? "border-[var(--cms-accent-primary)]" : "border-[var(--cms-border)]",
        className
      )}
    >
      <div className="flex items-center gap-2 pb-1">
        <span className={cx("h-[9px] w-[9px] rounded-full", DOT[tone])} aria-hidden="true" />
        <span className="text-[13px] font-semibold text-[var(--cms-text)]">{title}</span>
        {typeof count === "number" && <span className="ml-auto text-xs font-semibold text-[var(--cms-text-soft)]">{count}</span>}
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
  ref
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx(
        "rounded-[var(--r-md)] border bg-[var(--cms-surface)] p-3.5",
        dragging
          ? "border-2 border-[var(--cms-accent-primary)] shadow-[var(--cms-shadow-md)]"
          : "border-[var(--cms-border)] shadow-[var(--cms-shadow-sm)]",
        className
      )}
    >
      {children}
    </div>
  );
});
