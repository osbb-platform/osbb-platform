"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { createHouseDocument } from "@/src/modules/houses/actions/createHouseDocument";
import { deleteArchivedHouseDocuments } from "@/src/modules/houses/actions/deleteArchivedHouseDocuments";
import { deleteHouseDocument } from "@/src/modules/houses/actions/deleteHouseDocument";
import { updateHouseDocument } from "@/src/modules/houses/actions/updateHouseDocument";
import {
  getSinglePdfHintMessage,
  validateSinglePdfFile,
} from "@/src/shared/utils/validators/pdfUpload";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";

import type {
  HouseDocumentCategory,
  HouseDocumentListItem,
  HouseDocumentScope,
  HouseDocumentType,
  HouseDocumentVisibility,
} from "@/src/modules/houses/services/getHouseDocuments";

type HouseDocumentsWorkspaceProps = {
  houseId: string;
  documents: HouseDocumentListItem[];
  startInCreateMode?: boolean;
  documentScope?: HouseDocumentScope;
  headingTitle?: string;
  createTitle?: string;
  editTitle?: string;
  emptyTitle?: string;
  canConfirm?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
  embedded?: boolean;
};

type WorkspaceTab = "active" | "draft" | "archive";
type FormMode = "create" | "edit";
type ConfirmAction = "publish" | "archive" | "delete" | "delete_archive" | null;
type SubmitIntent = "save" | "publish" | "archive" | "delete";

const foundingDocumentTypeOptions: Array<{
  value: HouseDocumentType;
  label: string;
}> = [
  { value: "statute", label: "Статут" },
  { value: "extract", label: "Виписка" },
  { value: "protocol", label: "Протокол" },
  { value: "registration", label: "Реєстраційні документи" },
  { value: "contracts", label: "Договори" },
  { value: "other", label: "Інше" },
];

const categoryOptions: Array<{ value: HouseDocumentCategory; label: string }> = [
  { value: "regulations", label: "Регламент і статутні документи" },
  { value: "tariffs", label: "Тарифи та фінансові документи" },
  { value: "meetings", label: "Протоколи зборів" },
  { value: "technical", label: "Технічна документація" },
  { value: "contracts", label: "Договори та підрядники" },
  { value: "resident_info", label: "Оголошення та пам’ятки для мешканців" },
];

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) =>
  String(2026 - index),
);

function getCategoryLabel(category: HouseDocumentCategory) {
  return (
    categoryOptions.find((item) => item.value === category)?.label ?? category
  );
}

function getDocumentTypeLabel(documentType: HouseDocumentType | null) {
  if (!documentType) return "Тип не вказано";

  return (
    foundingDocumentTypeOptions.find((item) => item.value === documentType)
      ?.label ?? "Інше"
  );
}

function getVisibilityLabel(visibility: HouseDocumentVisibility) {
  if (visibility === "published") return "Активний";
  if (visibility === "private") return "Архів";
  return "Чернетка";
}

function getVisibilityClasses(visibility: HouseDocumentVisibility) {
  if (visibility === "published") {
    return "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  }

  if (visibility === "private") {
    return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text-muted)]";
  }

  return "border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)]";
}

function formatDate(value: string | null) {
  if (!value) return "Дату не вказано";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Дату не вказано";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "Дату не вказано";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Дату не вказано";

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "Розмір не вказано";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;

  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

function getEmptyText(tab: WorkspaceTab, fallback: string) {
  if (tab === "active") {
    return "Зараз немає активних документів. Після підтвердження вони відображатимуться тут і на публічній сторінці.";
  }

  if (tab === "draft") {
    return fallback;
  }

  return "Архів документів поки порожній. Перенесені картки відображатимуться тут.";
}

export function HouseDocumentsWorkspace({
  houseId,
  documents = [],
  startInCreateMode = false,
  documentScope = "information",
  headingTitle = "Документи",
  createTitle = "Новий документ",
  editTitle = "Редагування документа",
  emptyTitle = "Документи поки не знайдено. Створи перший документ через кнопку «Новий документ».",
  canConfirm = true,
  canArchive = true,
  canDelete = true,
  embedded = false,
}: HouseDocumentsWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    startInCreateMode ? "draft" : "active",
  );
  const [isFormOpen, setIsFormOpen] = useState(startInCreateMode);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>("save");
  const [actionLabel, setActionLabel] = useState("Обробляємо документ...");

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<HouseDocumentCategory>("regulations");
  const [visibility, setVisibility] =
    useState<HouseDocumentVisibility>("draft");
  const [documentYear, setDocumentYear] = useState<string>(YEAR_OPTIONS[0]);
  const [documentType, setDocumentType] = useState<HouseDocumentType>("statute");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  const isFoundingScope = documentScope === "founding";

  const activeDocuments = useMemo(
    () => documents.filter((document) => document.visibility_status === "published"),
    [documents],
  );

  const draftDocuments = useMemo(
    () => documents.filter((document) => document.visibility_status === "draft"),
    [documents],
  );

  const archivedDocuments = useMemo(
    () => documents.filter((document) => document.visibility_status === "private"),
    [documents],
  );

  const visibleDocuments = useMemo(() => {
    if (embedded) {
      const statusOrder: Record<HouseDocumentVisibility, number> = {
        published: 0,
        draft: 1,
        private: 2,
      };

      return documents
        .slice()
        .sort((left, right) => {
          const statusDiff =
            statusOrder[left.visibility_status] -
            statusOrder[right.visibility_status];

          if (statusDiff !== 0) return statusDiff;

          return right.updated_at.localeCompare(left.updated_at);
        });
    }

    if (activeTab === "active") return activeDocuments;
    if (activeTab === "archive") return archivedDocuments;
    return draftDocuments;
  }, [
    activeDocuments,
    activeTab,
    archivedDocuments,
    documents,
    draftDocuments,
    embedded,
  ]);

  const selectedDocument = useMemo(
    () =>
      selectedDocumentId
        ? documents.find((document) => document.id === selectedDocumentId) ?? null
        : null,
    [documents, selectedDocumentId],
  );

  const formMode: FormMode = selectedDocument ? "edit" : "create";
  const isDraftLikeEdit = formMode === "edit" && visibility === "draft";
  const isPublishedEdit = formMode === "edit" && visibility === "published";
  const isArchivedEdit = formMode === "edit" && visibility === "private";

  function resetForm() {
    setTitle("");
    setCategory("regulations");
    setVisibility("draft");
    setDocumentYear(YEAR_OPTIONS[0]);
    setDocumentType("statute");
    setDescription("");
    setSelectedFile(null);
    setFileError(null);
    setRemoveAttachment(false);
    setSubmitIntent("save");
    setConfirmAction(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeForm() {
    setIsFormOpen(false);
    setSelectedDocumentId(null);
    setActionError(null);
    setActionLabel("Обробляємо документ...");
    resetForm();
  }

  function openCreateMode() {
    if (!embedded) {
      setActiveTab("draft");
    }

    setSelectedDocumentId(null);
    resetForm();
    setIsFormOpen(true);
  }

  function switchToEditMode(document: HouseDocumentListItem) {
    setIsFormOpen(true);
    setSelectedDocumentId(document.id);
    setActionError(null);
    setTitle(document.title);
    setCategory(document.category);
    setVisibility(document.visibility_status);
    setDocumentYear(
      document.document_year ? String(document.document_year) : YEAR_OPTIONS[0],
    );
    setDocumentType(document.document_type ?? "statute");
    setDescription(document.description ?? "");
    setSelectedFile(null);
    setFileError(null);
    setRemoveAttachment(false);
    setSubmitIntent("save");
    setConfirmAction(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleTabChange(tab: WorkspaceTab) {
    setActiveTab(tab);
    setIsFormOpen(false);
    setSelectedDocumentId(null);
    setActionError(null);
    setConfirmAction(null);
    resetForm();
  }

  async function submitDocument(intent: SubmitIntent) {
    setActionError(null);
    setSubmitIntent(intent);
    setActionLabel(
      intent === "delete"
        ? "Видаляємо документ..."
        : intent === "publish"
          ? "Підтверджуємо документ..."
          : intent === "archive"
            ? "Архівуємо документ..."
            : selectedFile
              ? "Завантажуємо та зберігаємо документ..."
              : formMode === "edit"
                ? "Оновлюємо документ..."
                : "Створюємо документ...",
    );

    startTransition(async () => {
      try {
        if (intent === "delete") {
          if (!selectedDocument) return;

          const formData = new FormData();
          formData.set("houseId", houseId);
          formData.set("documentId", selectedDocument.id);

          const result = await deleteHouseDocument(formData);

          if (result.error) {
            setActionError(result.error);
            return;
          }

          closeForm();
          router.refresh();
          return;
        }

        const supabase = createSupabaseBrowserClient();

        let uploadedPdfPath = "";
        let uploadedPdfName = "";

        if (selectedFile) {
          const fileExt = selectedFile.name.split(".").pop() ?? "pdf";
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `${houseId}/${documentScope}-documents/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("house-documents")
            .upload(filePath, selectedFile, {
              upsert: true,
              contentType: "application/pdf",
            });

          if (uploadError) {
            setActionError(uploadError.message);
            return;
          }

          uploadedPdfPath = filePath;
          uploadedPdfName = selectedFile.name;
        }

        const nextVisibility: HouseDocumentVisibility =
          intent === "publish"
            ? "published"
            : intent === "archive"
              ? "private"
              : formMode === "create"
                ? "draft"
                : visibility;

        const formData = new FormData();
        formData.set("houseId", houseId);
        formData.set("title", title);
        formData.set("category", category);
        formData.set("visibilityStatus", nextVisibility);
        formData.set("documentScope", documentScope);
        formData.set("documentType", documentType);
        formData.set("documentYear", isFoundingScope ? "" : documentYear);
        formData.set("description", description);

        if (uploadedPdfPath) {
          formData.set("uploadedPdfPath", uploadedPdfPath);
          formData.set("uploadedPdfName", uploadedPdfName);
        }

        const result =
          formMode === "edit" && selectedDocument
            ? await updateHouseDocument(
                (() => {
                  formData.set("documentId", selectedDocument.id);
                  formData.set("removeAttachment", removeAttachment ? "true" : "false");
                  return formData;
                })(),
              )
            : await createHouseDocument(formData);

        if (result.error) {
          setActionError(result.error);
          return;
        }

        if (!embedded) {
          setActiveTab(
            nextVisibility === "published"
              ? "active"
              : nextVisibility === "private"
                ? "archive"
                : "draft",
          );
        }
        closeForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : formMode === "edit"
              ? "Не вдалося оновити документ."
              : "Не вдалося створити документ.",
        );
      }
    });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitDocument("save");
  }

  function handleDeleteArchive() {
    setActionError(null);
    setActionLabel("Видаляємо архів документів...");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("houseId", houseId);
      formData.set("documentScope", documentScope);

      const result = await deleteArchivedHouseDocuments(formData);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      closeForm();
      setActiveTab("archive");
      router.refresh();
    });
  }

  const hasExistingAttachment =
    selectedDocument?.attachment_status === "uploaded" &&
    Boolean(selectedDocument.storage_path);

  const shouldRenderForm =
    isFormOpen && (formMode === "create" || Boolean(selectedDocument));

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-3xl"
      />

      {!embedded ? (
      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--cms-text)]">{headingTitle}</h2>
            <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
              Документи створюються як чернетки. Після підтвердження вони стають активними та доступними на публічній сторінці.
            </p>
          </div>

          {activeTab === "archive" && archivedDocuments.length > 0 && canDelete ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmAction("delete_archive")}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-danger-border)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
            >
              {isPending && confirmAction === "delete_archive"
                ? "Видаляємо архів..."
                : "Видалити все"}
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateMode}
              disabled={isPending}
              className={`${adminPrimaryButtonClass} disabled:opacity-60`}
            >
              Новий документ
            </button>
          )}
        </div>

        <div className="mt-6">
          <AdminSegmentedTabs
            activeKey={activeTab}
            onChange={(key) => handleTabChange(key as WorkspaceTab)}
            items={[
              {
                key: "active",
                label: "Активні",
                count: activeDocuments.length,
              },
              {
                key: "draft",
                label: "Чернетки",
                count: draftDocuments.length,
              },
              {
                key: "archive",
                label: "Архів",
                count: archivedDocuments.length,
              },
            ]}
          />
        </div>
      </div>
      ) : null}

      {shouldRenderForm ? (
        <form
          onSubmit={handleFormSubmit}
          className={`${adminSurfaceClass} p-6`}
        >
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--cms-text)]">
                {formMode === "edit" ? editTitle : createTitle}
              </h3>
              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                {formMode === "edit"
                  ? "Картку відкрито у верхній формі. Тут можна змінити дані, замінити файл або виконати доступну дію."
                  : "Новий документ автоматично створюється як чернетка. Завантаж один PDF файл перед збереженням."}
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              aria-label="Закрити форму"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] text-xl font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
            >
              ×
            </button>
          </div>

          <div className="grid gap-4">
            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Назва документа
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Наприклад: Статут ОСББ"
                className={adminInputClass}
              />
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                {isFoundingScope ? "Тип документа" : "Категорія"}
              </label>
              {isFoundingScope ? (
                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value as HouseDocumentType)
                  }
                  className={adminInputClass}
                >
                  {foundingDocumentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as HouseDocumentCategory)
                  }
                  className={adminInputClass}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!isFoundingScope ? (
              <div>
                <label className={`mb-2 block ${adminTextLabelClass}`}>
                  Рік
                </label>
                <select
                  value={documentYear}
                  onChange={(event) => setDocumentYear(event.target.value)}
                  className={adminInputClass}
                >
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {formMode === "create" ? (
              <div>
                <label className={`mb-2 block ${adminTextLabelClass}`}>
                  PDF файл
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (!file) {
                      setSelectedFile(null);
                      setFileError(null);
                      return;
                    }

                    const validation = validateSinglePdfFile(file);

                    if (!validation.isValid) {
                      setSelectedFile(null);
                      setFileError(validation.error);
                      event.target.value = "";
                      return;
                    }

                    setFileError(null);
                    setSelectedFile(file);
                  }}
                  className="block w-full rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)] file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                />

                <p className="mt-2 text-xs text-[var(--cms-text-soft)]">
                  {getSinglePdfHintMessage()}
                </p>

                {fileError ? (
                  <div className="mt-2 text-xs text-red-400">{fileError}</div>
                ) : null}

                {selectedFile ? (
                  <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
                    Буде завантажено файл: {selectedFile.name} (
                    {formatFileSize(selectedFile.size)})
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Опис
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Короткий опис документа, складу або призначення"
                className={adminInputClass}
              />
            </div>

            {formMode === "edit" ? (
              <div className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--cms-text)]">
                      Файл документа
                    </div>
                    <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
                      Можна завантажити новий файл, щоб замінити поточний.
                    </p>
                  </div>

                  {hasExistingAttachment && selectedDocument ? (
                    <div className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium text-[var(--cms-text)]">
                          Поточний файл:{" "}
                          {selectedDocument.original_file_name ?? "Без назви"}
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--cms-text-muted)]">
                          <span>
                            Розмір: {formatFileSize(selectedDocument.file_size_bytes)}
                          </span>
                          <span>
                            Завантажено: {formatDateTime(selectedDocument.uploaded_at)}
                          </span>
                          <span>
                            Тип: {selectedDocument.mime_type || "Не вказано"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {selectedDocument.signed_file_url ? (
                            <a
                              href={selectedDocument.signed_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] px-4 py-2 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                            >
                              Відкрити поточний файл
                            </a>
                          ) : (
                            <span className="text-xs text-[var(--cms-text-soft)]">
                              Тимчасове посилання зараз недоступне.
                            </span>
                          )}

                          <label className="inline-flex items-center gap-2 text-sm text-[var(--cms-danger-text)]">
                            <input
                              type="checkbox"
                              checked={removeAttachment}
                              onChange={(event) => {
                                setRemoveAttachment(event.target.checked);
                                if (event.target.checked) {
                                  setSelectedFile(null);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                }
                              }}
                              className="h-4 w-4 rounded border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)]"
                            />
                            Видалити поточний файл
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface)] p-4 text-sm text-[var(--cms-text-muted)]">
                      У цього документа поки немає завантаженого файла.
                    </div>
                  )}

                  <div>
                    <label className={`mb-2 block ${adminTextLabelClass}`}>
                      Завантажити новий файл
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;

                        if (!file) {
                          setSelectedFile(null);
                          setFileError(null);
                          return;
                        }

                        const validation = validateSinglePdfFile(file);

                        if (!validation.isValid) {
                          setSelectedFile(null);
                          setFileError(validation.error);
                          event.target.value = "";
                          return;
                        }

                        setFileError(null);
                        setSelectedFile(file);
                        setRemoveAttachment(false);
                      }}
                      className="block w-full rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)] file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                    />

                    {fileError ? (
                      <div className="mt-2 text-xs text-red-400">{fileError}</div>
                    ) : null}

                    {selectedFile ? (
                      <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
                        Буде завантажено файл: {selectedFile.name} (
                        {formatFileSize(selectedFile.size)})
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
                {actionError}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
                <div className="flex flex-nowrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isPending || Boolean(fileError)}
                    className={`${adminPrimaryButtonClass} disabled:opacity-60`}
                  >
                    {isPending && submitIntent === "save" ? "Зберігаємо..." : "Зберегти"}
                  </button>

                  {formMode === "edit" &&
                  (isDraftLikeEdit || isArchivedEdit) &&
                  canDelete ? (
                    <button
                      type="button"
                      disabled={isPending || Boolean(fileError)}
                      onClick={() => setConfirmAction("delete")}
                      className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-danger-border)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "delete" ? "Видаляємо..." : "Видалити"}
                    </button>
                  ) : null}
                </div>

                {isDraftLikeEdit && canConfirm ? (
                  <button
                    type="button"
                    disabled={isPending || Boolean(fileError)}
                    onClick={() => setConfirmAction("publish")}
                    className="inline-flex items-center justify-center rounded-2xl bg-[var(--cms-success-bg)] border border-[var(--cms-success-border)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "publish" ? "Підтверджуємо..." : "Підтвердити"}
                  </button>
                ) : null}

                {isPublishedEdit && canArchive ? (
                  <button
                    type="button"
                    disabled={isPending || Boolean(fileError)}
                    onClick={() => setConfirmAction("archive")}
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-warning-border)] px-5 py-3 text-sm font-medium text-[var(--cms-warning-text)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "archive" ? "Архівуємо..." : "Архівувати"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <div className={`${adminSurfaceClass} p-6`}>
        {visibleDocuments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 text-sm leading-6 text-[var(--cms-text-muted)]">
            {getEmptyText(activeTab, emptyTitle)}
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleDocuments.map((document) => {
              const isSelected = document.id === selectedDocumentId && isFormOpen;
              const hasAttachment = document.attachment_status === "uploaded";

              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => switchToEditMode(document)}
                  className={[
                    "w-full rounded-3xl border bg-[var(--cms-surface-elevated)] p-5 text-left transition",
                    isSelected
                      ? "border-[var(--cms-border-strong)] bg-[var(--cms-surface)]"
                      : "border-[var(--cms-border)] hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface)]",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-base font-semibold text-[var(--cms-text)]">
                          {document.title || "Документ без назви"}
                        </div>

                        {isSelected ? (
                          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                            Відкрито у формі
                          </span>
                        ) : null}

                        {hasAttachment ? (
                          <span className="rounded-full border border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                            Файл прикріплено
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--cms-text-muted)]">
                        <span>
                          {isFoundingScope
                            ? getDocumentTypeLabel(document.document_type)
                            : getCategoryLabel(document.category)}
                        </span>

                        {!isFoundingScope ? (
                          <span className="rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-xs text-[var(--cms-text-muted)]">
                            {document.document_year
                              ? `Рік: ${document.document_year}`
                              : "Рік не вказано"}
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-xs text-[var(--cms-text-muted)]">
                            {getDocumentTypeLabel(document.document_type)}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--cms-text)]">
                        {document.description || "Опис документа поки не додано."}
                      </div>

                      {hasAttachment ? (
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--cms-text-muted)]">
                          <span>
                            Файл: {document.original_file_name || "Без назви"}
                          </span>
                          <span>
                            Розмір: {formatFileSize(document.file_size_bytes)}
                          </span>
                          <span>
                            Завантажено: {formatDateTime(document.uploaded_at)}
                          </span>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--cms-text-soft)]">
                        <span>Створено: {formatDate(document.created_at)}</span>
                        <span>Оновлено: {formatDateTime(document.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getVisibilityClasses(document.visibility_status)}`}
                      >
                        {getVisibilityLabel(document.visibility_status)}
                      </span>

                      <span className="text-xs text-[var(--cms-text-soft)]">
                        Натисни для редагування
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Підтвердити публікацію документа?"
        description="Після підтвердження документ стане активним та буде доступний на публічній сторінці будинку."
        confirmLabel="Підтвердити"
        pendingLabel="Підтверджуємо..."
        tone="publish"
        isPending={isPending && submitIntent === "publish"}
        onCancel={() => {
          if (!isPending) setConfirmAction(null);
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void submitDocument("publish");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перенести документ до архіву?"
        description="Після архівації документ зникне з публічної сторінки, але залишиться доступним у CMS в архіві."
        confirmLabel="Архівувати"
        pendingLabel="Архівуємо..."
        tone="warning"
        isPending={isPending && submitIntent === "archive"}
        onCancel={() => {
          if (!isPending) setConfirmAction(null);
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void submitDocument("archive");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title={isArchivedEdit ? "Видалити архівний документ?" : "Видалити чернетку документа?"}
        description="Документ буде видалено із системи без можливості відновлення разом із PDF файлом."
        confirmLabel="Видалити"
        pendingLabel="Видаляємо..."
        tone="destructive"
        isPending={isPending && submitIntent === "delete"}
        onCancel={() => {
          if (!isPending) setConfirmAction(null);
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void submitDocument("delete");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "delete_archive"}
        title="Видалити всі архівні документи?"
        description="Усі документи з архіву будуть безповоротно видалені разом із PDF файлами. Відновлення після цього неможливе."
        confirmLabel="Видалити архів"
        pendingLabel="Видаляємо архів..."
        tone="destructive"
        isPending={isPending}
        onCancel={() => {
          if (!isPending) setConfirmAction(null);
        }}
        onConfirm={() => {
          setConfirmAction(null);
          handleDeleteArchive();
        }}
      />
    </div>
  );
}
