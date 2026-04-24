"use client";

import { useEffect } from "react";

export type PlatformConfirmTone =
  | "destructive"
  | "warning"
  | "publish"
  | "neutral";

type PlatformConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string | null;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: PlatformConfirmTone;
  isPending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function getToneClasses(tone: PlatformConfirmTone) {
  if (tone === "destructive") {
    return {
      icon: "border-red-800 bg-red-950/60 text-red-300",
      confirmButton:
        "border border-red-800 bg-red-950/70 text-red-200 hover:bg-red-950 disabled:opacity-60",
      accent: "text-red-300",
    };
  }

  if (tone === "warning") {
    return {
      icon: "border-amber-700 bg-amber-950/60 text-amber-300",
      confirmButton:
        "border border-amber-700 bg-amber-950/70 text-amber-200 hover:bg-amber-950 disabled:opacity-60",
      accent: "text-amber-300",
    };
  }

  if (tone === "publish") {
    return {
      icon: "border-emerald-700 bg-emerald-950/60 text-emerald-300",
      confirmButton:
        "border border-emerald-700 bg-emerald-950/70 text-emerald-200 hover:bg-emerald-950 disabled:opacity-60",
      accent: "text-emerald-300",
    };
  }

  return {
    icon: "border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text-secondary)]",
    confirmButton:
      "border border-slate-600 bg-white text-slate-950 hover:bg-slate-200 disabled:opacity-60",
    accent: "text-[var(--cms-text-secondary)]",
  };
}

function getToneGlyph(tone: PlatformConfirmTone) {
  if (tone === "destructive") return "!";
  if (tone === "warning") return "!";
  if (tone === "publish") return "↑";
  return "?";
}

export function PlatformConfirmModal({
  open,
  title,
  description = null,
  confirmLabel,
  cancelLabel = "Скасувати",
  tone = "neutral",
  isPending = false,
  pendingLabel = "Виконуємо...",
  onConfirm,
  onCancel,
}: PlatformConfirmModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPending, onCancel, open]);

  if (!open) {
    return null;
  }

  const toneClasses = getToneClasses(tone);
  const glyph = getToneGlyph(tone);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="platform-confirm-title"
      onMouseDown={() => {
        if (!isPending) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)]"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold ${toneClasses.icon}`}
            aria-hidden="true"
          >
            {glyph}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="platform-confirm-title"
              className="text-lg font-semibold text-[var(--cms-text-primary)]"
            >
              {title}
            </h3>

            {description ? (
              <p className="mt-2 text-sm leading-6 text-[var(--cms-text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-5 py-3 text-sm font-medium text-[var(--cms-text-secondary)] transition hover:border-[var(--cms-border-secondary)] hover:bg-[var(--cms-bg-tertiary)] disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium transition ${toneClasses.confirmButton}`}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
