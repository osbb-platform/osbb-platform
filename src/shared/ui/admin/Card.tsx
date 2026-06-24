import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type CardProps = {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  inset?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

export function Card({ title, actions, inset, className, bodyClassName, children }: CardProps) {
  return (
    <section
      className={cx(
        "rounded-[var(--r-xl)] border shadow-[var(--cms-shadow-sm)]",
        inset
          ? "border-[var(--cms-border)] bg-[var(--cms-surface-muted)]"
          : "border-[var(--cms-border)] bg-[var(--cms-surface)]",
        className
      )}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-[var(--cms-border)] px-6 py-4">
          {title && <h3 className="text-[16px] font-semibold text-[var(--cms-text)]">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
