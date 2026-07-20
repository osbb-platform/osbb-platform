"use client";

import type { ReactNode } from "react";
import {
  adminDangerButtonClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
  adminSuccessButtonClass,
  adminWarningButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
import { FormEvent, useRef, useState, type ChangeEvent } from "react";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { AnnouncementPdfUploadBlock } from "@/src/modules/houses/components/AnnouncementPdfUploadBlock";
import {
  normalizeAnnouncementPdfFromContent,
  uploadAnnouncementPdf,
} from "@/src/modules/houses/components/announcementPdfUpload";
import { validateSinglePdfFile } from "@/src/shared/utils/validators/pdfUpload";
import { formatAdminDateTime } from "@/src/shared/utils/format/formatAdminDate";

type EditAnnouncementSectionFormProps = {
  headerActions?: ReactNode;
  houseId: string;
  houseSlug: string;
  housePageId?: string | null;
  section: {
    id: string;
    title: string | null;
    status: "draft" | "published" | "archived";
    content: Record<string, unknown>;
  };
  onClose?: () => void;
};

function getLevelLabel(level: string) {
  if (level === "danger") {
    return "Важливе";
  }

  if (level === "warning") {
    return "Звернути увагу";
  }

  return "Звичайне оголошення";
}

export function EditAnnouncementSectionForm({
  headerActions,
  houseId,
  houseSlug,
  housePageId,
  section,
  onClose,
}: EditAnnouncementSectionFormProps) {
  const { dispatch, isPending } = useAdminContentCommand();
  const formRef = useRef<HTMLFormElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "publish" | "archive" | "delete" | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<
    "publish" | "archive" | "delete" | null
  >(null);
  const body =
    typeof section.content.body === "string" ? section.content.body : "";

  const level =
    typeof section.content.level === "string" ? section.content.level : "info";

  const currentPdf = normalizeAnnouncementPdfFromContent(section.content.pdf);
  const publishedAt = formatAdminDateTime(section.content.publishedAt);
  const updatedAt = formatAdminDateTime(section.content.updatedAt);

  const isDraftLike =
    section.status === "draft";
  const isPublished = section.status === "published";
  const isArchived = section.status === "archived";

  function buildFormData() {
    const formElement = formRef.current;

    if (!formElement) {
      throw new Error("Форму оголошення не знайдено.");
    }

    return new FormData(formElement);
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
    setRemovePdf(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setActionError(null);

    try {
      const formData = buildFormData();
      const uploadedPdf = await uploadAnnouncementPdf({
        houseId,
        announcementId: section.id,
        file: selectedPdf,
      });

      await dispatch(
        {
          type: "announcements.update",
          houseId,
          payload: {
            id: section.id,
            lockVersion:
              typeof section.content.lockVersion === "number"
                ? section.content.lockVersion
                : 1,
            title: String(formData.get("title") ?? ""),
            body: String(formData.get("body") ?? ""),
            level: String(formData.get("level") ?? "info"),
            isPinned: formData.get("isPinned") === "on",
            pdf: uploadedPdf,
            removePdf,
          },
        },
        {
          onSuccess: () => onClose?.(),
          onError: setActionError,
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти оголошення.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function runMutation(kind: "publish" | "archive" | "delete") {
    setActionError(null);
    setPendingAction(kind);

    const commandType =
      kind === "publish"
        ? "announcements.publish"
        : kind === "archive"
          ? "announcements.archive"
          : "announcements.delete";

    try {
      await dispatch(
        {
          type: commandType,
          houseId,
          payload: {
            id: section.id,
            lockVersion:
              typeof section.content.lockVersion === "number"
                ? section.content.lockVersion
                : 1,
          },
        },
        {
          onSuccess: () => onClose?.(),
          onError: setActionError,
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося виконати дію.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  void houseSlug;
  void housePageId;

  const combinedError = actionError;
  const buttonsDisabled = isPending || pendingAction !== null;
  const saveDisabled = buttonsDisabled || isSaving || Boolean(pdfError);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--cms-text)]">
            Редагування оголошення
          </div>
          <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
            Зміни зберігаються в секції та історії версій.
          </div>
        </div>

        {onClose ? (
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити редактор"
              className={adminIconButtonClass}
            >
              ×
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={[adminInsetSurfaceClass, "px-4 py-3"].join(" ")}>
          <div className="text-sm text-[var(--cms-text-muted)]">Дата публікації</div>
          <div className="mt-1 font-medium text-[var(--cms-text)]">{publishedAt}</div>
        </div>

        <div className={[adminInsetSurfaceClass, "px-4 py-3"].join(" ")}>
          <div className="text-sm text-[var(--cms-text-muted)]">Останнє оновлення</div>
          <div className="mt-1 font-medium text-[var(--cms-text)]">{updatedAt}</div>
        </div>

        <div className={[adminInsetSurfaceClass, "px-4 py-3"].join(" ")}>
          <div className="text-sm text-[var(--cms-text-muted)]">Поточний тип</div>
          <div className="mt-1 font-medium text-[var(--cms-text)]">
            {getLevelLabel(level)}
          </div>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSave} className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок оголошення
          </label>
          <input
            name="title"
            type="text"
            defaultValue={section.title ?? ""}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Тип оголошення
          </label>
          <select
            name="level"
            defaultValue={level}
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
              defaultChecked={Boolean(section.content.isPinned)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--cms-text)]">
                Закріпити оголошення
              </span>
              <span className="mt-1 block text-xs text-[var(--cms-text-muted)]">
                Після публікації воно стане головним оголошенням будинку.
                Закріплення іншого оголошення автоматично зніме попереднє.
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
            defaultValue={body}
            rows={6}
            className={adminInputClass}
          />
        </div>

        <AnnouncementPdfUploadBlock
          inputId={`announcement-edit-pdf-${section.id}`}
          currentPdf={currentPdf}
          selectedFile={selectedPdf}
          removePdf={removePdf}
          disabled={buttonsDisabled || isSaving}
          error={pdfError}
          onChange={handlePdfChange}
          onRemoveCurrent={() => {
            setRemovePdf(true);
            setSelectedPdf(null);
            setPdfError(null);
            if (pdfInputRef.current) {
              pdfInputRef.current.value = "";
            }
          }}
        />

        {combinedError ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {combinedError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
            <div className="flex flex-nowrap items-center gap-3">
              <button
                type="button"
                disabled={saveDisabled}
                onClick={() => {
                  setActionError(null);
                  formRef.current?.requestSubmit();
                }}
                className={`${adminPrimaryButtonClass} min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl ${
                  isSaving ? "cursor-wait opacity-90" : ""
                } disabled:opacity-60`}
              >
                {isSaving
                  ? selectedPdf
                    ? "Завантажуємо PDF..."
                    : "Зберігаємо..."
                  : "Зберегти"}
              </button>

              {isDraftLike ? (
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("delete")}
                  className={`${adminDangerButtonClass} min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl disabled:opacity-60`}
                >
                  {pendingAction === "delete" ? "Видаляємо..." : "Видалити"}
                </button>
              ) : null}
            </div>

            {isDraftLike ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("publish")}
                  className={`${adminSuccessButtonClass} min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl disabled:opacity-60`}
                >
                  {pendingAction === "publish" ? "Підтверджуємо..." : "Підтвердити"}
                </button>
              </div>
            ) : null}

            {isPublished ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("archive")}
                  className={`${adminWarningButtonClass} min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl disabled:opacity-60`}
                >
                  {pendingAction === "archive" ? "Архівуємо..." : "Архівувати"}
                </button>
              </div>
            ) : null}

            {isArchived ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("delete")}
                  className={`${adminDangerButtonClass} min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl disabled:opacity-60`}
                >
                  {pendingAction === "delete" ? "Видаляємо..." : "Видалити"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </form>

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title={isArchived ? "Видалити архівне оголошення?" : "Видалити чернетку оголошення?"}
        description={
          isArchived
            ? "Архівне оголошення буде видалено із системи без можливості відновлення."
            : "Чернетку оголошення буде видалено без можливості відновлення. Ця дія торкнеться лише поточного запису."
        }
        confirmLabel="Видалити оголошення"
        pendingLabel="Видаляємо..."
        tone="destructive"
        isPending={pendingAction === "delete"}
        onCancel={() => {
          if (!pendingAction) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void runMutation("delete");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Підтвердити публікацію оголошення?"
        description="Після підтвердження оголошення стане видимим для мешканців на сайті будинку."
        confirmLabel="Підтвердити публікацію"
        pendingLabel="Підтверджуємо..."
        tone="publish"
        isPending={pendingAction === "publish"}
        onCancel={() => {
          if (!pendingAction) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void runMutation("publish");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перенести оголошення в архів?"
        description="Після архівації оголошення зникне з публічної частини сайту і перестане бути видимим мешканцям. У CMS воно залишиться доступним в архіві."
        confirmLabel="Архівувати оголошення"
        pendingLabel="Архівуємо..."
        tone="warning"
        isPending={pendingAction === "archive"}
        onCancel={() => {
          if (!pendingAction) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void runMutation("archive");
        }}
      />
    </div>
  );
}
