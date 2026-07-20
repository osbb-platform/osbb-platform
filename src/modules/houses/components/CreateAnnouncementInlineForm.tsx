"use client";

import { FormEvent, useRef, useState, type ChangeEvent } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { AnnouncementPdfUploadBlock } from "@/src/modules/houses/components/AnnouncementPdfUploadBlock";
import {
  createClientUuid,
  uploadAnnouncementPdf,
} from "@/src/modules/houses/components/announcementPdfUpload";
import {
  adminBodyClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetPaddingClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
import { validateSinglePdfFile } from "@/src/shared/utils/validators/pdfUpload";

type CreateAnnouncementInlineFormProps = {
  houseId: string;
  houseSlug: string;
  housePageId: string;
  onClose?: () => void;
};

export function CreateAnnouncementInlineForm({
  houseId,
  houseSlug,
  housePageId,
  onClose,
}: CreateAnnouncementInlineFormProps) {
  const { dispatch, isPending } = useAdminContentCommand();
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handlePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedPdf(null);
      setPdfError(null);
      return;
    }

    const validation = validateSinglePdfFile(file);

    if (!validation.isValid) {
      setSelectedPdf(null);
      setPdfError(validation.error);
      event.target.value = "";
      return;
    }

    setPdfError(null);
    setSelectedPdf(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);
    setIsUploading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const announcementId = createClientUuid();
      const pdf = await uploadAnnouncementPdf({
        houseId,
        announcementId,
        file: selectedPdf,
      });

      await dispatch(
        {
          type: "announcements.create",
          houseId,
          payload: {
            id: announcementId,
            title: String(formData.get("title") ?? ""),
            body: String(formData.get("body") ?? ""),
            level: String(formData.get("level") ?? "info"),
            isPinned: formData.get("isPinned") === "on",
            pdf,
          },
        },
        {
          onSuccess: () => onClose?.(),
          onError: setSubmitError,
        },
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти оголошення.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  void houseSlug;
  void housePageId;

  const isBusy = isPending || isUploading;

  return (
    <div className={[adminInsetSurfaceClass, adminInsetPaddingClass].join(" ")}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--cms-text)]">
            Нове оголошення
          </div>
          <div className={["mt-1", adminBodyClass].join(" ")}>
            Нове оголошення створюється як чернетка у вкладці «Чернетки».
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити форму"
            className={adminIconButtonClass}
          >
            ×
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок оголошення
          </label>
          <input
            name="title"
            type="text"
            placeholder="Наприклад: Відключення води"
            className={adminInputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Тип оголошення
          </label>
          <select
            name="level"
            defaultValue="info"
            className={adminInputClass}
          >
            <option value="danger">Червоний — важливе</option>
            <option value="warning">Помаранчевий — звернути увагу</option>
            <option value="info">Салатовий — звичайне оголошення</option>
          </select>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              name="isPinned"
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--cms-text)]">
                Закріпити оголошення
              </span>
              <span className="mt-1 block text-xs text-[var(--cms-text-muted)]">
                Після публікації воно стане головним оголошенням будинку.
                Одночасно може бути закріплене лише одне опубліковане
                оголошення.
              </span>
            </span>
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Текст оголошення
          </label>
          <textarea
            name="body"
            rows={6}
            placeholder="Введіть текст оголошення"
            className={adminInputClass}
          />
        </div>

        <AnnouncementPdfUploadBlock
          inputId="announcement-create-pdf"
          selectedFile={selectedPdf}
          removePdf={false}
          disabled={isBusy}
          error={pdfError}
          onChange={handlePdfChange}
        />

        {submitError ? (
          <p role="alert" className="text-sm text-[var(--cms-danger-text)]">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isBusy || Boolean(pdfError)}
            className={[adminPrimaryButtonClass, "min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl disabled:opacity-60"].join(" ")}
          >
            {isBusy
              ? selectedPdf
                ? "Завантажуємо PDF..."
                : "Зберігаємо..."
              : "Зберегти"}
          </button>

          {selectedPdf ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setSelectedPdf(null);
                setPdfError(null);
                if (pdfInputRef.current) {
                  pdfInputRef.current.value = "";
                }
              }}
              className="text-sm font-medium text-[var(--cms-text-muted)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              Очистити вибір PDF
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
