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

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows = 5,
  empty,
  footer,
  className,
}: TableProps<T>) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] shadow-[var(--cms-shadow-sm)]",
        className,
      )}
      aria-busy={loading || undefined}
    >
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className="bg-[var(--cms-surface-muted)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={cx(
                    "border-b border-[var(--cms-border)] px-[18px] py-[13px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]",
                    ALIGN[column.align ?? "left"],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, index) => (
                <tr key={`sk-${index}`} className="border-b border-[var(--cms-border)]">
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
              rows.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={cx(
                    "border-b border-[var(--cms-border)] transition-colors hover:bg-[var(--cms-surface-muted)]",
                    index % 2 === 1 && "bg-[var(--cms-surface-muted)]/60",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        "px-[18px] py-3.5 text-[var(--cms-text)]",
                        ALIGN[column.align ?? "left"],
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer ? (
        <div className="flex items-center justify-between border-t border-[var(--cms-border)] bg-[var(--cms-surface)] px-[18px] py-3">
          {footer}
        </div>
      ) : null}
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
    "inline-flex h-[34px] w-[34px] items-center justify-center rounded-[var(--r-sm)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)] transition-colors hover:border-[var(--cms-border-strong)] hover:text-[var(--cms-text)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <span className="text-[13px] text-[var(--cms-text-soft)]">
        {from}–{to} з {total}
      </span>

      <div className="flex gap-1.5">
        <button type="button" className={btn} aria-label="Назад" onClick={onPrev}>
          <svg
            viewBox="0 0 24 24"
            className="h-[15px] w-[15px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button type="button" className={btn} aria-label="Далі" onClick={onNext}>
          <svg
            viewBox="0 0 24 24"
            className="h-[15px] w-[15px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </>
  );
}
