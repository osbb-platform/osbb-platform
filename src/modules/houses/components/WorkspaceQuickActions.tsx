"use client";

export type WorkspaceQuickAction = {
  key: string;
  label: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  onSelect: () => void;
};

type WorkspaceQuickActionsProps = {
  actions: WorkspaceQuickAction[];
  ariaLabel?: string;
};

export function WorkspaceQuickActions({
  actions,
  ariaLabel = "Швидкі дії",
}: WorkspaceQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-2"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          title={action.label}
          aria-label={action.label}
          disabled={action.disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onSelect();
          }}
          className={[
            "inline-flex min-h-8 items-center justify-center rounded-[var(--r-md)] border px-3 text-xs font-semibold transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cms-focus)] focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            action.tone === "danger"
              ? "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:brightness-95"
              : "border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)] hover:border-[var(--cms-border-strong)] hover:text-[var(--cms-text)]",
          ].join(" ")}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
