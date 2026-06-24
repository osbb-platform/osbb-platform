"use client";

import { useCallback } from "react";

import { Button, type AdminButtonVariant } from "@/src/shared/ui/admin/Button";
import { Modal } from "@/src/shared/ui/admin/Modal";
import { Spinner } from "@/src/shared/ui/admin/Spinner";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoCircleIcon,
} from "@/src/shared/ui/icons/AdminInlineIcons";

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

function getToneClasses(tone: PlatformConfirmTone): {
  icon: string;
  accent: string;
  confirmVariant: AdminButtonVariant;
} {
  if (tone === "destructive") {
    return {
      icon: "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
      accent: "text-[var(--cms-danger-text)]",
      confirmVariant: "danger",
    };
  }

  if (tone === "warning") {
    return {
      icon: "border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]",
      accent: "text-[var(--cms-warning-text)]",
      confirmVariant: "warning",
    };
  }

  if (tone === "publish") {
    return {
      icon: "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
      accent: "text-[var(--cms-success-text)]",
      confirmVariant: "success",
    };
  }

  return {
    icon: "border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]",
    accent: "text-[var(--cms-text-muted)]",
    confirmVariant: "secondary",
  };
}

function renderToneIcon(tone: PlatformConfirmTone) {
  if (tone === "destructive" || tone === "warning") {
    return <AlertTriangleIcon className="h-5 w-5" />;
  }

  if (tone === "publish") {
    return <CheckCircleIcon className="h-5 w-5" />;
  }

  return <InfoCircleIcon className="h-5 w-5" />;
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
  const handleCancel = useCallback(() => {
    if (!isPending) {
      onCancel();
    }
  }, [isPending, onCancel]);

  if (!open) {
    return null;
  }

  const toneClasses = getToneClasses(tone);

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      size="md"
      closeOnOverlay
      aria-labelledby="platform-confirm-title"
      overlayClassName="z-[120] px-4 py-6 backdrop-blur-sm"
      className="w-full max-w-xl !p-6"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-lg)] border text-lg font-semibold ${toneClasses.icon}`}
          aria-hidden="true"
        >
          {renderToneIcon(tone)}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            id="platform-confirm-title"
            className="font-[family-name:var(--font-serif)] text-[21px] font-semibold tracking-[-0.01em] text-[var(--cms-text)]"
          >
            {title}
          </h3>

          {description ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-[1.6] text-[var(--cms-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isPending}
        >
          {cancelLabel}
        </Button>

        <Button
          type="button"
          variant={toneClasses.confirmVariant}
          onClick={onConfirm}
          disabled={isPending}
          iconLeft={isPending ? <Spinner size="sm" aria-label={pendingLabel} /> : null}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
