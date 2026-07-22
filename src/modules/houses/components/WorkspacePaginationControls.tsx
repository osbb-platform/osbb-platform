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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3">
      <span className="text-sm text-[var(--cms-text-muted)]">
        Показано {shown} з {total}
      </span>

      {remaining > 0 ? (
        <button
          type="button"
          onClick={onShowMore}
          className="inline-flex h-9 items-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
        >
          Показати ще {nextCount}
        </button>
      ) : null}
    </div>
  );
}
