"use client";

import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoCircleIcon,
} from "@/src/shared/ui/icons/AdminInlineIcons";
import { adminButtonDisabledClass } from "@/src/shared/ui/admin/adminStyles";

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
      icon: "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
      confirmButton:
        ["border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:opacity-90", adminButtonDisabledClass].join(" "),
      accent: "text-[var(--cms-danger-text)]",
    };
  }

  if (tone === "warning") {
    return {
      icon: "border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]",
      confirmButton:
        ["border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)] hover:opacity-90", adminButtonDisabledClass].join(" "),
      accent: "text-[var(--cms-warning-text)]",
    };
  }

  if (tone === "publish") {
    return {
      icon: "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
      confirmButton:
        ["border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)] hover:opacity-90", adminButtonDisabledClass].join(" "),
      accent: "text-[var(--cms-success-text)]",
    };
  }

  return {
    icon: "border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text-muted)]",
    confirmButton:
      ["border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text)] hover:bg-[var(--cms-bg-tertiary)]", adminButtonDisabledClass].join(" "),
    accent: "text-[var(--cms-text-muted)]",
  };
}

function getToneIcon(tone: PlatformConfirmTone) {
  if (tone === "destructive" || tone === "warning") {
    return AlertTriangleIcon;
  }

  if (tone === "publish") {
    return CheckCircleIcon;
  }

  return InfoCircleIcon;
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
  const ToneIcon = getToneIcon(tone);

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
            <ToneIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="platform-confirm-title"
              className="text-lg font-semibold text-[var(--cms-text)]"
            >
              {title}
            </h3>

            {description ? (
              <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
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
            className={["inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-5 py-3 text-sm font-medium text-[var(--cms-text-muted)] transition hover:border-[var(--cms-border-secondary)] hover:bg-[var(--cms-bg-tertiary)]", adminButtonDisabledClass].join(" ")}
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
