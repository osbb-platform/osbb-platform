"use client";

import { IconButton } from "@/src/shared/ui/admin/IconButton";

export type WorkspaceViewMode = "rows" | "grid";

type WorkspaceViewToggleProps = {
  value: WorkspaceViewMode;
  onChange: (value: WorkspaceViewMode) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

function RowsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M4.5 4.5h6v6h-6v-6ZM13.5 4.5h6v6h-6v-6ZM4.5 13.5h6v6h-6v-6ZM13.5 13.5h6v6h-6v-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkspaceViewToggle({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Вигляд списку",
}: WorkspaceViewToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-1"
    >
      <IconButton type="button" size="sm" variant={value === "rows" ? "subtle" : "ghost"} aria-label="Рядки" aria-pressed={value === "rows"} title="Рядки" disabled={disabled} onClick={() => onChange("rows")}>
        <RowsIcon />
      </IconButton>
      <IconButton type="button" size="sm" variant={value === "grid" ? "subtle" : "ghost"} aria-label="Сітка" aria-pressed={value === "grid"} title="Сітка" disabled={disabled} onClick={() => onChange("grid")}>
        <GridIcon />
      </IconButton>
    </div>
  );
}
