"use client";

import { useWorkspaceMemory } from "@/src/shared/hooks/useWorkspaceMemory";
import { WorkspacePaginationControls } from "@/src/modules/houses/components/WorkspacePaginationControls";
import { WorkspaceViewToggle, type WorkspaceViewMode } from "@/src/modules/houses/components/WorkspaceViewToggle";
import { WorkspaceQuickActions } from "@/src/modules/houses/components/WorkspaceQuickActions";

import {
  AdminStatusBadge,
  statusLabelFor,
  statusToneFor } from "@/src/shared/ui/admin/AdminStatusBadge";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";

import { useMemo,
  useRef,
  useState } from "react";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { FileDropzone } from "@/src/shared/ui/admin/FileDropzone";
import {
  getSinglePdfHintMessage,
  validateSinglePdfFile,
  } from "@/src/shared/utils/validators/pdfUpload";
import {
  adminInputClass,
  adminSurfaceClass,
  adminTextLabelClass,
  adminButtonClasses,
} from "@/src/shared/ui/admin/adminStyles";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { useDirtyGuard } from "@/src/shared/hooks/useDirtyGuard";

import type {
  HouseDocumentCategory,
  HouseDocumentListItem,
  HouseDocumentScope,
  HouseDocumentType,
  HouseDocumentLifecycle,
} from "@/src/modules/houses/services/getHouseDocuments";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";

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
  duplicateTargets?: CrossHouseDuplicateTarget[];
};

type WorkspaceTab = "active" | "draft" | "archive";
type FormMode = "create" | "edit";
type ConfirmAction = "publish" | "archive" | "delete" | "delete_archive" | null;
type SubmitIntent = "save" | "publish" | "archive" | "delete" | "copy";

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

function createDocumentUploadFileName(fileExt: string) {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
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

type DocumentSortMode =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "year_desc"
  | "year_asc";

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
  duplicateTargets = [],
}: HouseDocumentsWorkspaceProps) {
  const { dispatch, isPending } = useAdminContentCommand();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useWorkspaceMemory<WorkspaceTab>(
    "documents",
    "activeTab",
    startInCreateMode ? "draft" : "active",
    ["active", "draft", "archive"],
  );
  const [isFormOpen, setIsFormOpen] = useState(startInCreateMode);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>("save");
  const [actionLabel, setActionLabel] = useState("Обробляємо документ...");
  const [documentSearchQuery, setDocumentSearchQuery] =
    useWorkspaceMemory("documents", "searchQuery", "");
  const [viewMode, setViewMode] = useWorkspaceMemory<WorkspaceViewMode>(
    `documents-${documentScope}`,
    "viewMode",
    "rows",
    ["rows", "grid"],
  );
  const [visibleDocumentCount, setVisibleDocumentCount] = useState(20);
  const [documentSortMode, setDocumentSortMode] =
    useWorkspaceMemory<DocumentSortMode>(
      "documents",
      "sortMode",
      "updated_desc",
      [
        "updated_desc",
        "updated_asc",
        "title_asc",
        "title_desc",
        "year_desc",
        "year_asc",
      ],
    );

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<HouseDocumentCategory>("regulations");
  const [lifecycle, setLifecycle] =
    useState<HouseDocumentLifecycle>("draft");
  const [documentYear, setDocumentYear] = useState<string>(YEAR_OPTIONS[0]);
  const [documentType, setDocumentType] = useState<HouseDocumentType>("statute");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [panelDirty, setPanelDirty] = useState(false);
  const dirtyGuard = useDirtyGuard({ isDirty: panelDirty });

  const isFoundingScope = documentScope === "founding";

  const activeDocuments = useMemo(
    () => documents.filter((document) => document.lifecycle_status === "published"),
    [documents],
  );

  const draftDocuments = useMemo(
    () => documents.filter((document) => document.lifecycle_status === "draft"),
    [documents],
  );

  const archivedDocuments = useMemo(
    () => documents.filter((document) => document.lifecycle_status === "archived"),
    [documents],
  );

  const baseVisibleDocuments = useMemo(() => {
    if (embedded) {
      const statusOrder: Record<HouseDocumentLifecycle, number> = {
        published: 0,
        draft: 1,
        archived: 2,
      };

      return documents
        .slice()
        .sort((left, right) => {
          const statusDiff =
            statusOrder[left.lifecycle_status] -
            statusOrder[right.lifecycle_status];

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

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = documentSearchQuery.trim().toLowerCase();

    const filtered = baseVisibleDocuments.filter((document) => {
      if (!normalizedQuery) return true;

      return [
        document.title,
        document.description,
        document.original_file_name,
        document.document_year ? String(document.document_year) : "",
        getCategoryLabel(document.category),
        getDocumentTypeLabel(document.document_type),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return filtered.slice().sort((left, right) => {
      if (documentSortMode === "title_asc") {
        return left.title.localeCompare(right.title, "uk", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (documentSortMode === "title_desc") {
        return right.title.localeCompare(left.title, "uk", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (documentSortMode === "year_desc") {
        return Number(right.document_year ?? 0) - Number(left.document_year ?? 0);
      }

      if (documentSortMode === "year_asc") {
        return Number(left.document_year ?? 0) - Number(right.document_year ?? 0);
      }

      if (documentSortMode === "updated_asc") {
        return left.updated_at.localeCompare(right.updated_at);
      }

      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [baseVisibleDocuments, documentSearchQuery, documentSortMode]);

  const selectedDocument = useMemo(
    () =>
      selectedDocumentId
        ? documents.find((document) => document.id === selectedDocumentId) ?? null
        : null,
    [documents, selectedDocumentId],
  );

  const formMode: FormMode = selectedDocument ? "edit" : "create";
  const isDraftLikeEdit = formMode === "edit" && lifecycle === "draft";
  const isPublishedEdit = formMode === "edit" && lifecycle === "published";
  const isArchivedEdit = formMode === "edit" && lifecycle === "archived";

  function markDirty() {
    if (!panelDirty) {
      setPanelDirty(true);
    }
  }

  function resetForm() {
    setTitle("");
    setCategory("regulations");
    setLifecycle("draft");
    setDocumentYear(YEAR_OPTIONS[0]);
    setDocumentType("statute");
    setDescription("");
    setSelectedFile(null);
    setFileError(null);
    setRemoveAttachment(false);
    setPanelDirty(false);
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

  function requestCloseForm() {
    dirtyGuard.request(closeForm);
  }

  function openCreateMode() {
    dirtyGuard.request(() => {
      if (!embedded) {
        setActiveTab("draft");
      }

      setSelectedDocumentId(null);
      resetForm();
      setIsFormOpen(true);
    });
  }

  function switchToEditMode(document: HouseDocumentListItem) {
    dirtyGuard.request(() => {
      setIsFormOpen(true);
      setSelectedDocumentId(document.id);
      setActionError(null);
      setTitle(document.title);
      setCategory(document.category);
      setLifecycle(document.lifecycle_status);
      setDocumentYear(
        document.document_year
          ? String(document.document_year)
          : YEAR_OPTIONS[0],
      );
      setDocumentType(document.document_type ?? "statute");
      setDescription(document.description ?? "");
      setSelectedFile(null);
      setFileError(null);
      setRemoveAttachment(false);
      setPanelDirty(false);
      setSubmitIntent("save");
      setConfirmAction(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  function prepareQuickAction(
    document: HouseDocumentListItem,
    action: "publish" | "archive" | "delete",
  ) {
    setIsFormOpen(false);
    setSelectedDocumentId(document.id);
    setActionError(null);
    setTitle(document.title);
    setCategory(document.category);
    setLifecycle(document.lifecycle_status);
    setDocumentYear(
      document.document_year
        ? String(document.document_year)
        : YEAR_OPTIONS[0],
    );
    setDocumentType(document.document_type ?? "statute");
    setDescription(document.description ?? "");
    setSelectedFile(null);
    setFileError(null);
    setRemoveAttachment(false);
    setPanelDirty(false);
    setSubmitIntent("save");
    setConfirmAction(action);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleTabChange(tab: WorkspaceTab) {
    dirtyGuard.request(() => {
      setActiveTab(tab);
      setIsFormOpen(false);
      setSelectedDocumentId(null);
      setActionError(null);
      setConfirmAction(null);
      resetForm();
    });
  }

  function buildDocumentYearPayload() {
    if (isFoundingScope) {
      return null;
    }

    const parsedYear = Number.parseInt(documentYear, 10);
    return Number.isInteger(parsedYear) ? parsedYear : null;
  }

  async function uploadSelectedPdf() {
    if (!selectedFile) {
      return null;
    }

    const supabase = createSupabaseBrowserClient();
    const fileExt = selectedFile.name.split(".").pop() ?? "pdf";
    const fileName = createDocumentUploadFileName(fileExt);
    const filePath = `${houseId}/${documentScope}-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("house-documents")
      .upload(filePath, selectedFile, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("House document PDF upload error:", uploadError);
      throw new Error(
        "Не вдалося завантажити PDF. Якщо сесія завершилась, увійдіть в адмінку ще раз і повторіть дію.",
      );
    }

    return {
      bucket: "house-documents",
      path: filePath,
      originalName: selectedFile.name,
      mimeType: "application/pdf",
      size: selectedFile.size,
    };
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

    try {
      if (intent === "delete") {
        if (!selectedDocument) return;

        const result = await dispatch<HouseDocumentListItem>(
          {
            type: "documents.delete",
            houseId,
            payload: {
              id: selectedDocument.id,
              lockVersion: selectedDocument.lock_version,
            },
          },
          {
            onError: setActionError,
          },
        );

        if (!result) return;

        closeForm();
        return;
      }

      const uploadedPdf = await uploadSelectedPdf();

      if (formMode === "create") {
        if (!uploadedPdf) {
          setActionError("PDF не завантажено.");
          return;
        }

        const created = await dispatch<HouseDocumentListItem>(
          {
            type: "documents.create",
            houseId,
            payload: {
              title,
              category,
              description,
              documentScope,
              documentType,
              documentYear: buildDocumentYearPayload(),
              pdf: uploadedPdf,
            },
          },
          {
            onError: setActionError,
          },
        );

        if (!created) return;

        if (!embedded) {
          setActiveTab("draft");
        }

        closeForm();
        return;
      }

      if (!selectedDocument) return;

      const updated = await dispatch<HouseDocumentListItem>(
        {
          type: "documents.update",
          houseId,
          payload: {
            id: selectedDocument.id,
            lockVersion: selectedDocument.lock_version,
            title,
            category,
            description,
            documentScope,
            documentType,
            documentYear: buildDocumentYearPayload(),
            pdf: uploadedPdf,
            removePdf: removeAttachment,
          },
        },
        {
          onError: setActionError,
        },
      );

      if (!updated) return;

      if (intent === "publish" || intent === "archive") {
        const nextType =
          intent === "publish" ? "documents.publish" : "documents.archive";

        const lifecycleResult = await dispatch<HouseDocumentListItem>(
          {
            type: nextType,
            houseId,
            payload: {
              id: updated.id,
              lockVersion: updated.lock_version,
            },
          },
          {
            onError: setActionError,
          },
        );

        if (!lifecycleResult) return;

        if (!embedded) {
          setActiveTab(intent === "publish" ? "active" : "archive");
        }

        closeForm();
        return;
      }

      if (!embedded) {
        setActiveTab(
          updated.lifecycle_status === "published"
            ? "active"
            : updated.lifecycle_status === "archived"
              ? "archive"
              : "draft",
        );
      }

      closeForm();
    } catch (error) {
      console.error("House document submit error:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : formMode === "edit"
            ? "Не вдалося оновити документ. Оновіть сторінку і повторіть дію."
            : "Не вдалося створити документ. Оновіть сторінку і повторіть дію.",
      );
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitDocument("save");
  }

  async function handleDeleteArchive() {
    setActionError(null);
    setActionLabel("Видаляємо архів документів...");
    setSubmitIntent("delete");

    const result = await dispatch(
      {
        type: "documents.deleteAllArchived",
        houseId,
        payload: {
          documentScope,
        },
      },
      {
        onError: setActionError,
      },
    );

    if (!result) return;

    closeForm();
    setActiveTab("archive");
  }

  async function copyDocumentToDraft(document: HouseDocumentListItem) {
    setActionError(null);
    setSubmitIntent("copy");
    setActionLabel("Копіюємо документ у чернетку...");

    const copied = await dispatch(
      {
        type: "documents.duplicate",
        houseId,
        payload: {
          sourceId: document.id,
          targetHouseIds: [houseId],
        },
      },
      {
        onError: setActionError,
      },
    );

    if (!copied) return;

    closeForm();

    if (!embedded) {
      setActiveTab("draft");
    }
  }

  async function copySelectedDocumentToDraft() {
    if (!selectedDocument) return;
    await copyDocumentToDraft(selectedDocument);
  }

  const hasExistingAttachment =
    selectedDocument?.attachment_status === "uploaded" &&
    Boolean(selectedDocument.storage_path);

  const shouldRenderForm =
    isFormOpen && (formMode === "create" || Boolean(selectedDocument));

  const panelTitle = formMode === "edit" ? editTitle : createTitle;
  const panelDescription = selectedDocument ? (
    <div className="flex flex-wrap items-center gap-3">
      <AdminStatusBadge tone={statusToneFor(selectedDocument.lifecycle_status)}>
        {statusLabelFor(selectedDocument.lifecycle_status)}
      </AdminStatusBadge>
      <span>Оновлено: {formatDateTime(selectedDocument.updated_at)}</span>
      {(isPublishedEdit || isArchivedEdit) ? (
        <ContentWorkspaceActionButtons
          houseId={houseId}
          sourceId={selectedDocument.id}
          commandType="documents.duplicate"
          duplicateTargets={duplicateTargets}
          disabled={isPending || Boolean(fileError)}
          isCopying={isPending && submitIntent === "copy"}
          onCopy={copySelectedDocumentToDraft}
          duplicatePanelTitle="Копії документа в інші будинки"
        />
      ) : null}
    </div>
  ) : (
    "Новий документ автоматично створюється як чернетка."
  );

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-[var(--r-xl)]"
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
              className={adminButtonClasses({ variant: "danger" })}
            >
              {isPending && confirmAction === "delete_archive"
                ? "Видаляємо архів..."
                : "Видалити все"}
            </button>
          ) : (
            <button
              type="button"
              data-workspace-create-action="true"
              title="Створити (N)"
              onClick={openCreateMode}
              disabled={isPending}
              className={`${adminButtonClasses({ variant: "primary" })} disabled:opacity-60`}
            >
              Новий документ
            </button>
          )}
        </div>

        <div className="mt-6">
          <AdminSegmentedTabs
            activeKey={activeTab}
            onChange={(key) => {
              setVisibleDocumentCount(20);
              handleTabChange(key as WorkspaceTab);
            }}
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

      <AdminSidePanel
        title={panelTitle}
        description={panelDescription}
        isOpen={shouldRenderForm}
        onClose={requestCloseForm}
      >
        {shouldRenderForm ? (
          <form
            onSubmit={handleFormSubmit}
            onChange={markDirty}
            className="grid gap-4"
          >
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
                <FileDropzone
                  inputRef={fileInputRef}
                  accept="application/pdf,.pdf"
                  hint={getSinglePdfHintMessage()}
                  label={hasExistingAttachment ? "Замінити PDF" : "Додати PDF"}
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
                    markDirty();
                  }}
                  file={selectedFile}
                  disabled={isPending}
                  kind="pdf"
                />

                <p className="mt-2 text-xs text-[var(--cms-text-soft)]">
                  {getSinglePdfHintMessage()}
                </p>

                {fileError ? (
                  <div role="alert" className="mt-2 text-xs text-[var(--cms-danger-text)]">{fileError}</div>
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
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
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
                    <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
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
                              className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] px-4 py-2 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
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
                                markDirty();
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
                    <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface)] p-4 text-sm text-[var(--cms-text-muted)]">
                      У цього документа поки немає завантаженого файла.
                    </div>
                  )}

                  <div>
                    <label className={`mb-2 block ${adminTextLabelClass}`}>
                      Завантажити новий файл
                    </label>
                <FileDropzone
                  inputRef={fileInputRef}
                  accept="application/pdf,.pdf"
                  hint={getSinglePdfHintMessage()}
                  label={hasExistingAttachment ? "Замінити PDF" : "Додати PDF"}
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
                    markDirty();
                  }}
                  file={selectedFile}
                  disabled={isPending}
                  kind="pdf"
                />

                    {fileError ? (
                      <div role="alert" className="mt-2 text-xs text-[var(--cms-danger-text)]">{fileError}</div>
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
              <div
                role="alert"
                className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
              >
                {actionError}
              </div>
            ) : null}

            <div className="sticky bottom-0 z-20 -mx-6 mt-4 border-t border-[var(--cms-border)] bg-[var(--cms-surface)] px-6 py-4 shadow-[var(--cms-shadow-up)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit" title="Зберегти (Ctrl/Cmd+Enter)"
                    disabled={isPending || Boolean(fileError)}
                    className={`${adminButtonClasses({ variant: "primary" })} disabled:opacity-60`}
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
                      className={adminButtonClasses({ variant: "danger" })}
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
                    className={adminButtonClasses({ variant: "success" })}
                  >
                    {isPending && submitIntent === "publish" ? "Публікуємо..." : "Опублікувати"}
                  </button>
                ) : null}

                {isPublishedEdit && canArchive ? (
                  <button
                    type="button"
                    disabled={isPending || Boolean(fileError)}
                    onClick={() => setConfirmAction("archive")}
                    className={adminButtonClasses({ variant: "secondary" })}
                  >
                    {isPending && submitIntent === "archive" ? "Переносимо..." : "В архів"}
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        ) : null}
      </AdminSidePanel>

      <div className={`${adminSurfaceClass} p-6`}>
        {!isFoundingScope && baseVisibleDocuments.length > 0 ? (
          <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-soft)]">
                Пошук документа
              </span>
              <input
                value={documentSearchQuery}
                onChange={(event) => {
                  setDocumentSearchQuery(event.target.value);
                  setVisibleDocumentCount(20);
                }}
                placeholder="Назва, опис, файл або рік"
                className={adminInputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-soft)]">
                Сортування
              </span>
              <select
                value={documentSortMode}
                onChange={(event) => {
                  setDocumentSortMode(event.target.value as DocumentSortMode);
                  setVisibleDocumentCount(20);
                }}
                className={adminInputClass}
              >
                <option value="updated_desc">Спочатку оновлені</option>
                <option value="updated_asc">Спочатку старі оновлення</option>
                <option value="title_asc">Назва А–Я</option>
                <option value="title_desc">Назва Я–А</option>
                <option value="year_desc">Рік: нові зверху</option>
                <option value="year_asc">Рік: старі зверху</option>
              </select>
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WorkspacePaginationControls
            visible={visibleDocumentCount}
            total={visibleDocuments.length}
            onShowMore={() =>
              setVisibleDocumentCount((current) => current + 20)
            }
          />
          <WorkspaceViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {visibleDocuments.length === 0 ? (
          <EmptyState
            title={baseVisibleDocuments.length === 0 ? (activeTab === "draft" ? "Чернеток документів поки немає" : String(activeTab).startsWith("archiv") ? "Архів документів поки порожній" : "Активних документів поки немає") : "Документів за пошуком не знайдено"}
            description={baseVisibleDocuments.length === 0 ? getEmptyText(activeTab, emptyTitle) : "Змініть запит або очистіть поле пошуку."}
            action={baseVisibleDocuments.length === 0 && !String(activeTab).startsWith("archiv") ? (
              <button type="button" data-workspace-create-action="true"
              title="Створити (N)"
              onClick={openCreateMode} className={adminButtonClasses({ variant: "primary" })}>Створити документ</button>
            ) : undefined}
          />
        ) : (
          <div
            className={[
              "grid gap-4",
              viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
            ].join(" ")}
          >
            {visibleDocuments.slice(0, visibleDocumentCount).map((document) => {
              const isSelected = document.id === selectedDocumentId && isFormOpen;
              const hasAttachment = document.attachment_status === "uploaded";

              return (
                <div
                  key={document.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => switchToEditMode(document)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      switchToEditMode(document);
                    }
                  }}
                  className={[
                    "relative w-full rounded-[var(--r-xl)] border bg-[var(--cms-surface-elevated)] p-5 pr-16 text-left transition",
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
                          <span className="rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-text)]">
                            Відкрито у формі
                          </span>
                        ) : null}

                        {hasAttachment ? (
                          <span className="rounded-[var(--r-pill)] border border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
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
                          <span className="rounded-[var(--r-pill)] border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-xs text-[var(--cms-text-muted)]">
                            {document.document_year
                              ? `Рік: ${document.document_year}`
                              : "Рік не вказано"}
                          </span>
                        ) : (
                          <span className="rounded-[var(--r-pill)] border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-xs text-[var(--cms-text-muted)]">
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
                      <AdminStatusBadge tone={statusToneFor(document.lifecycle_status)}>
                        {statusLabelFor(document.lifecycle_status)}
                      </AdminStatusBadge>

                      <WorkspaceQuickActions
                        actions={[
                          ...(document.lifecycle_status === "draft" && canConfirm
                            ? [
                                {
                                  key: "publish",
                                  label: "Опублікувати",
                                  onSelect: () =>
                                    prepareQuickAction(document, "publish"),
                                },
                              ]
                            : []),
                          ...(document.lifecycle_status === "published"
                            ? [
                                ...(canArchive
                                  ? [
                                      {
                                        key: "archive",
                                        label: "В архів",
                                        onSelect: () =>
                                          prepareQuickAction(document, "archive"),
                                      },
                                    ]
                                  : []),
                                {
                                  key: "duplicate",
                                  label: "Створити на основі",
                                  disabled: isPending,
                                  onSelect: () =>
                                    void copyDocumentToDraft(document),
                                },
                              ]
                            : []),
                          ...((document.lifecycle_status === "draft" ||
                          document.lifecycle_status === "archived") &&
                          canDelete
                            ? [
                                {
                                  key: "delete",
                                  label: "Видалити",
                                  tone: "danger" as const,
                                  onSelect: () =>
                                    prepareQuickAction(document, "delete"),
                                },
                              ]
                            : []),
                        ]}
                      />

                      <span className="text-xs text-[var(--cms-text-soft)]">
                        Натисни для редагування
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlatformConfirmModal
        open={dirtyGuard.confirmOpen}
        title="Є незбережені зміни"
        description="Якщо продовжити, внесені зміни буде втрачено."
        confirmLabel="Вийти без збереження"
        cancelLabel="Продовжити редагування"
        tone="warning"
        onCancel={dirtyGuard.cancel}
        onConfirm={dirtyGuard.discardAndContinue}
      />

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
