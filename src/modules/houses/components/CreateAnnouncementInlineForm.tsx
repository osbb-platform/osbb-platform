"use client";

import {
  FormEvent,
  useRef,
  useState,
  type ChangeEvent } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { AnnouncementPdfUploadBlock } from "@/src/modules/houses/components/AnnouncementPdfUploadBlock";
import {
  createClientUuid,
  uploadAnnouncementPdf,
  } from "@/src/modules/houses/components/announcementPdfUpload";
import {
  adminInputClass,
  adminButtonClasses,
} from "@/src/shared/ui/admin/adminStyles";
import { validateSinglePdfFile } from "@/src/shared/utils/validators/pdfUpload";

type CreateAnnouncementInlineFormProps = {
  houseId: string;
  houseSlug: string;
  housePageId: string;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function CreateAnnouncementInlineForm({
  houseId,
  houseSlug,
  housePageId,
  onClose,
  onDirtyChange,
}: CreateAnnouncementInlineFormProps) {
  const { dispatch, isPending } = useAdminContentCommand();
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  function markDirty() {
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
  }

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
    markDirty();
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
          onSuccess: () => {
            setIsDirty(false);
            onDirtyChange?.(false);
            onClose?.();
          },
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} onChange={markDirty} className="grid gap-4">
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

        <div className="sticky bottom-0 z-20 -mx-6 mt-4 flex flex-wrap gap-3 border-t border-[var(--cms-border)] bg-[var(--cms-surface)] px-6 py-4 shadow-[var(--cms-shadow-up)]">
          <button
            type="submit" title="Зберегти (Ctrl/Cmd+Enter)"
            disabled={isBusy || Boolean(pdfError)}
            className={adminButtonClasses({ variant: "primary" })}
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
                markDirty();
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
