"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubModal.tsx
// Модалка публічки: оверлей --pub-overlay, картка --pub-surface/--r-2xl/lg-тінь.
// Escape + клік по оверлею закривають; body-scroll lock; портал у document.body.
// Логіку форм усередину НЕ зашиваємо — це лише оболонка.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cx } from "./pubStyles";

export type PubModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  /** Контент футера (зазвичай кнопки). Якщо не задано — футер не рендериться. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Заборонити закриття по оверлею (напр., під час сабміту). */
  disableOverlayClose?: boolean;
  children: ReactNode;
};

const SIZE = { sm: "max-w-[420px]", md: "max-w-[520px]", lg: "max-w-[680px]" } as const;

export function PubModal({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  size = "md",
  disableOverlayClose = false,
  children,
}: PubModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Фокус на діалог для доступності.
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="pub-theme-root fixed inset-0 z-[90] flex items-center justify-center p-6 bg-[var(--pub-overlay)] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (!disableOverlayClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          "w-full overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)] outline-none",
          SIZE[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--pub-border)] px-6 py-5">
          <div>
            {eyebrow ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                {eyebrow}
              </div>
            ) : null}
            <div className="mt-1 font-[var(--font-serif)] text-[22px] font-semibold text-[var(--pub-text)]">
              {title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] transition hover:bg-[var(--pub-bg-quiet)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-3 border-t border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
