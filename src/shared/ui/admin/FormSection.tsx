import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type FormSectionProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
  children: React.ReactNode;
};

export function FormSection({ title, description, columns = 1, className, children }: FormSectionProps) {
  return (
    <section className={cx("flex flex-col gap-4", className)}>
      <div>
        <h3 className="text-[16px] font-semibold text-[var(--cms-text)]">{title}</h3>
        {description && <p className="mt-1 text-sm leading-[1.6] text-[var(--cms-text-muted)]">{description}</p>}
      </div>
      <div className={cx("grid gap-4", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>{children}</div>
    </section>
  );
}
