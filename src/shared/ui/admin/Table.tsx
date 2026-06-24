import * as React from "react";
import { SkeletonRow } from "./Skeleton";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
};

export type TableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function Table<T>({ columns, rows, rowKey, loading, skeletonRows = 5, empty, footer, className }: TableProps<T>) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] shadow-[var(--cms-shadow-sm)]",
        className
      )}
    >
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className="bg-[var(--cms-surface-muted)]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={cx(
                    "border-b border-[var(--cms-border)] px-[18px] py-[13px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]",
                    ALIGN[c.align ?? "left"]
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-[var(--cms-border)]">
                  <td colSpan={columns.length} className="px-[18px] py-3.5">
                    <SkeletonRow />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-[18px] py-10">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className={cx(
                    "border-b border-[var(--cms-border)] transition-colors hover:bg-[var(--cms-surface-muted)]",
                    i % 2 === 1 && "bg-[var(--cms-surface-muted)]/60"
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cx("px-[18px] py-3.5 text-[var(--cms-text)]", ALIGN[c.align ?? "left"])}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="flex items-center justify-between border-t border-[var(--cms-border)] bg-[var(--cms-surface)] px-[18px] py-3">{footer}</div>}
    </div>
  );
}

export function TablePager({
  from,
  to,
  total,
  onPrev,
  onNext,
}: {
  from: number;
  to: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const btn =
    "inline-flex h-[34px] w-[34px] items-center justify-center rounded-[var(--r-sm)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)] transition-colors hover:border-[var(--cms-border-strong)] hover:text-[var(--cms-text)] disabled:opacity-50";

  return (
    <>
      <span className="text-[13px] text-[var(--cms-text-soft)]">
        {from}–{to} з {total}
      </span>
      <div className="flex gap-1.5">
        <button className={btn} aria-label="Назад" onClick={onPrev}>
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className={btn} aria-label="Далі" onClick={onNext}>
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </>
  );
}
