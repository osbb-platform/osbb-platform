"use client";

import { useEffect, useRef, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [isOpen]);

  if (actions.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="absolute right-3 top-3 z-10"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        title={ariaLabel}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className="inline-flex size-9 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-lg font-bold leading-none text-[var(--cms-text-muted)] shadow-sm transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface-elevated)] hover:text-[var(--cms-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cms-focus)]"
      >
        <span aria-hidden="true" className="-translate-y-0.5">•••</span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={ariaLabel}
          className="absolute right-0 top-11 min-w-52 overflow-hidden rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-1.5 shadow-[var(--cms-shadow-lg)]"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(false);
                action.onSelect();
              }}
              className={[
                "flex min-h-10 w-full items-center rounded-[var(--r-md)] px-3 text-left text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cms-focus)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
                action.tone === "danger"
                  ? "text-[var(--cms-danger-text)] hover:bg-[var(--cms-danger-bg)]"
                  : "text-[var(--cms-text)] hover:bg-[var(--cms-surface-muted)]",
              ].join(" ")}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
