"use client";

type WorkspacePaginationControlsProps = {
  visible: number;
  total: number;
  step?: number;
  onShowMore: () => void;
};

export function WorkspacePaginationControls({
  visible,
  total,
  step = 20,
  onShowMore,
}: WorkspacePaginationControlsProps) {
  if (total <= 0) return null;

  const shown = Math.min(visible, total);
  const remaining = Math.max(0, total - shown);
  const nextCount = Math.min(step, remaining);

  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 px-0.5">
      <span className="text-xs font-medium text-[var(--cms-text-soft)]">
        Показано {shown} з {total}
      </span>

      {remaining > 0 ? (
        <button
          type="button"
          onClick={onShowMore}
          className="inline-flex h-8 items-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-transparent px-3 text-xs font-semibold text-[var(--cms-text-muted)] transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
        >
          Показати ще {nextCount}
        </button>
      ) : null}
    </div>
  );
}
