import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type TagProps = {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
};

export function Tag({ children, onRemove, className }: TagProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] text-[var(--cms-pill-text)] text-[13px] font-medium",
        onRemove ? "py-1.5 pl-3 pr-2" : "px-3 py-1.5",
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Прибрати"
          onClick={onRemove}
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[var(--cms-text-soft)] transition-colors hover:bg-[var(--cms-border-strong)] hover:text-[var(--cms-text)]"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
}
