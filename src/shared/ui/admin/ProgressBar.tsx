import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type ProgressBarProps = {
  value: number;
  className?: string;
  showLabel?: boolean;
};

export function ProgressBar({ value, className, showLabel }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, value));

  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--cms-surface-muted)]"
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-[var(--cms-accent-primary)] transition-[width] duration-300" style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="text-[13px] font-semibold text-[var(--cms-text)]">{Math.round(v)}%</span>}
    </div>
  );
}
