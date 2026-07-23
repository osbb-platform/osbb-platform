"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";

import { IconButton } from "@/src/shared/ui/admin/IconButton";

type AdminSidePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  footer?: ReactNode;
  maxWidthClassName?: "max-w-2xl" | "max-w-4xl";
  children: ReactNode;
};

export function AdminSidePanel({
  title,
  description = null,
  isOpen,
  onClose,
  footer = null,
  maxWidthClassName = "max-w-2xl",
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
      className="fixed inset-0 z-[110] bg-[var(--cms-overlay)] backdrop-blur-sm motion-safe:animate-[osbb-fade_.15s_ease]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={onClose}
    >
      <aside
        className={[
          "ml-auto flex h-full w-full flex-col border-l border-[var(--cms-border)] bg-[var(--cms-surface)] shadow-[var(--cms-shadow-lg)] motion-safe:animate-[osbb-pop_.2s_ease]",
          maxWidthClassName,
        ].join(" ")}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="shrink-0 border-b border-[var(--cms-border)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-[family-name:var(--font-serif)] text-[22px] font-semibold leading-7 tracking-[-0.01em] text-[var(--cms-text)]"
              >
                {title}
              </h2>

              {description ? (
                <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                  {description}
                </div>
              ) : null}
            </div>

            <IconButton
              type="button"
              variant="ghost"
              onClick={onClose}
              aria-label="Закрити"
              className="shrink-0"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </IconButton>
          </div>
        </div>

        <div className={["min-h-0 flex-1 overflow-y-auto p-6", footer ? "pb-28" : ""].join(" ")}>
          {children}
        </div>

        {footer ? (
          <div
            className={[
              "fixed bottom-0 right-0 w-full border-t border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-up)]",
              maxWidthClassName,
            ].join(" ")}
          >
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
