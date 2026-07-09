"use client";

import type { ChangeEvent } from "react";
import type { HouseAnnouncementFileInput } from "@/src/modules/content-engine/v2/handlers/announcements/types";
import {
  getFileSizeLabel,
  getPdfFileLabel,
} from "@/src/modules/houses/components/announcementPdfUpload";
import {
  adminDangerButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
import { getSinglePdfHintMessage } from "@/src/shared/utils/validators/pdfUpload";

type AnnouncementPdfUploadBlockProps = {
  inputId: string;
  currentPdf?: HouseAnnouncementFileInput | null;
  selectedFile: File | null;
  removePdf: boolean;
  disabled?: boolean;
  error?: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCurrent?: () => void;
};

export function AnnouncementPdfUploadBlock({
  inputId,
  currentPdf,
  selectedFile,
  removePdf,
  disabled = false,
  error,
  onChange,
  onRemoveCurrent,
}: AnnouncementPdfUploadBlockProps) {
  const selectedSize = getFileSizeLabel(selectedFile?.size ?? null);
  const currentSize = getFileSizeLabel(currentPdf?.size ?? null);
  const hasCurrentPdf = Boolean(currentPdf?.path) && !removePdf;

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--cms-text)]">
            PDF-додаток
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--cms-text-muted)]">
            Додайте один PDF-файл до оголошення. Файл завантажується через CMS і
            буде доступний мешканцям тільки після публікації оголошення.
          </p>
          <p className="mt-1 text-xs text-[var(--cms-text-soft)]">
            {getSinglePdfHintMessage()}
          </p>
        </div>

        {hasCurrentPdf && onRemoveCurrent ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemoveCurrent}
            className={`${adminDangerButtonClass} shrink-0 disabled:opacity-60`}
          >
            Видалити PDF
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-[var(--r-md)] border border-dashed border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] p-4">
        {selectedFile ? (
          <div className="text-sm text-[var(--cms-text)]">
            Новий PDF: <span className="font-medium">{selectedFile.name}</span>
            {selectedSize ? (
              <span className="text-[var(--cms-text-muted)]"> · {selectedSize}</span>
            ) : null}
          </div>
        ) : hasCurrentPdf ? (
          <div className="text-sm text-[var(--cms-text)]">
            Поточний PDF: <span className="font-medium">{getPdfFileLabel(currentPdf)}</span>
            {currentSize ? (
              <span className="text-[var(--cms-text-muted)]"> · {currentSize}</span>
            ) : null}
          </div>
        ) : removePdf ? (
          <div className="text-sm text-[var(--cms-warning-text)]">
            PDF буде видалено після збереження.
          </div>
        ) : (
          <div className="text-sm text-[var(--cms-text-muted)]">
            PDF поки не прикріплено.
          </div>
        )}

        <input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
        />

        <label
          htmlFor={inputId}
          className={`${adminSecondaryButtonClass} mt-4 inline-flex cursor-pointer ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Завантажити / замінити PDF
        </label>
      </div>

      {error ? (
        <div role="alert" className="mt-3 text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
