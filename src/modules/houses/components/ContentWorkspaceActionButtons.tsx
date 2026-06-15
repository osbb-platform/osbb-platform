"use client";

import { useMemo, useState } from "react";

import {
  CrossHouseDuplicatePanel,
  type CrossHouseDuplicateTarget,
} from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import {
  adminButtonDisabledClass,
  adminIconButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
import {
  CopyIcon,
  DuplicateIcon,
} from "@/src/shared/ui/icons/AdminInlineIcons";

type ContentWorkspaceActionButtonsProps = {
  houseId: string;
  sourceId: string;
  commandType: AdminCommand["type"];
  duplicateTargets?: CrossHouseDuplicateTarget[];
  disabled?: boolean;
  copyDisabled?: boolean;
  duplicateDisabled?: boolean;
  isCopying?: boolean;
  copyAriaLabel?: string;
  duplicateAriaLabel?: string;
  copyConfirmTitle?: string;
  copyConfirmDescription?: string;
  duplicatePanelTitle?: string;
  duplicatePanelDescription?: string;
  onCopy: () => void | Promise<void>;
  onDuplicateSuccess?: () => void;
};

export function ContentWorkspaceActionButtons({
  houseId,
  sourceId,
  commandType,
  duplicateTargets = [],
  disabled = false,
  copyDisabled = false,
  duplicateDisabled = false,
  isCopying = false,
  copyAriaLabel = "Створити копію в чернетці",
  duplicateAriaLabel = "Створити копії в інших будинках",
  copyConfirmTitle = "Створити копію як чернетку?",
  copyConfirmDescription = "У поточному будинку буде створено нову чернетку на основі цієї записи. Оригінал не зміниться.",
  duplicatePanelTitle = "Копії в інші будинки",
  duplicatePanelDescription = "Оберіть цільові будинки. У кожному з них буде створено нову чернетку, а поточний будинок виключено зі списку.",
  onCopy,
  onDuplicateSuccess,
}: ContentWorkspaceActionButtonsProps) {
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [duplicatePanelOpen, setDuplicatePanelOpen] = useState(false);

  const hasAvailableDuplicateTargets = useMemo(() => {
    return duplicateTargets.some(
      (target) =>
        target.id !== houseId &&
        target.isActive &&
        !target.archivedAt,
    );
  }, [duplicateTargets, houseId]);

  const copyButtonClass = [
    adminIconButtonClass,
    adminButtonDisabledClass,
    "bg-[var(--cms-surface)] text-[var(--cms-text-muted)]",
    "hover:bg-[var(--cms-surface-elevated)] hover:text-[var(--cms-text)]",
    "disabled:opacity-50",
  ].join(" ");

  const duplicateButtonClass = [
    adminIconButtonClass,
    adminButtonDisabledClass,
    "border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] text-[var(--cms-text)]",
    "shadow-[inset_0_0_0_2px_var(--cms-border-strong)]",
    "hover:bg-[var(--cms-surface-elevated)]",
    "disabled:opacity-50",
  ].join(" ");

  async function confirmCopy() {
    setCopyConfirmOpen(false);
    await onCopy();
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setCopyConfirmOpen(true)}
          disabled={disabled || copyDisabled || isCopying}
          className={copyButtonClass}
          aria-label={copyAriaLabel}
          title={isCopying ? "Створюємо копію..." : copyAriaLabel}
        >
          <CopyIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setDuplicatePanelOpen(true)}
          disabled={
            disabled ||
            duplicateDisabled ||
            !hasAvailableDuplicateTargets
          }
          className={duplicateButtonClass}
          aria-label={duplicateAriaLabel}
          title={
            hasAvailableDuplicateTargets
              ? duplicateAriaLabel
              : "Немає доступних активних будинків"
          }
        >
          <DuplicateIcon className="h-5 w-5" />
        </button>
      </div>

      <PlatformConfirmModal
        open={copyConfirmOpen}
        title={copyConfirmTitle}
        description={copyConfirmDescription}
        confirmLabel="Створити чернетку"
        cancelLabel="Скасувати"
        tone="warning"
        onCancel={() => setCopyConfirmOpen(false)}
        onConfirm={() => void confirmCopy()}
      />

      <AdminSidePanel
        title={duplicatePanelTitle}
        description={duplicatePanelDescription}
        isOpen={duplicatePanelOpen}
        onClose={() => setDuplicatePanelOpen(false)}
      >
        <CrossHouseDuplicatePanel
          houseId={houseId}
          sourceId={sourceId}
          commandType={commandType}
          targets={duplicateTargets}
          disabled={disabled || duplicateDisabled}
          onCancel={() => setDuplicatePanelOpen(false)}
          onSuccess={() => {
            setDuplicatePanelOpen(false);
            onDuplicateSuccess?.();
          }}
        />
      </AdminSidePanel>
    </>
  );
}
