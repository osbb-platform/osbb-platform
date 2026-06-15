"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";

import {
  adminButtonDisabledClass,
  adminFocusRingClass,
} from "@/src/shared/ui/admin/adminStyles";

type AdminSidePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
};

export function AdminSidePanel({
  title,
  description = null,
  isOpen,
  onClose,
  footer = null,
  children,
}: AdminSidePanelProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-[rgba(15,23,42,0.50)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={onClose}
    >
      <aside
        className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] shadow-[0_24px_80px_rgba(2,6,23,0.55)]"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="shrink-0 border-b border-[var(--cms-border-primary)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-xl font-semibold leading-7 text-[var(--cms-text)]"
              >
                {title}
              </h2>

              {description ? (
                <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                  {description}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={[
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-bg-tertiary)]",
                adminFocusRingClass,
                adminButtonDisabledClass,
              ].join(" ")}
              aria-label="Закрити"
            >
              ×
            </button>
          </div>
        </div>

        <div className={["min-h-0 flex-1 overflow-y-auto p-6", footer ? "pb-28" : ""].join(" ")}>
          {children}
        </div>

        {footer ? (
          <div className="fixed bottom-0 right-0 w-full max-w-2xl border-t border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6 shadow-[0_-18px_48px_rgba(2,6,23,0.18)]">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
