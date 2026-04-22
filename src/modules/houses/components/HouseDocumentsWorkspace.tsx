"use client";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { createHouseDocument } from "@/src/modules/houses/actions/createHouseDocument";
import { deleteHouseDocument } from "@/src/modules/houses/actions/deleteHouseDocument";
import { updateHouseDocument } from "@/src/modules/houses/actions/updateHouseDocument";
import {
  getSinglePdfHintMessage,
  validateSinglePdfFile,
} from "@/src/shared/utils/validators/pdfUpload";
import type {
  HouseDocumentCategory,
  HouseDocumentListItem,
  HouseDocumentVisibility,
} from "@/src/modules/houses/services/getHouseDocuments";

type HouseDocumentsWorkspaceProps = {
  houseId: string;
  documents: HouseDocumentListItem[];
  startInCreateMode?: boolean;
};

const categoryOptions: Array<{ value: HouseDocumentCategory; label: string }> = [
  { value: "regulations", label: "Регламент и уставные документы" },
  { value: "tariffs", label: "Тарифы и финансовые документы" },
  { value: "meetings", label: "Протоколы собраний" },
  { value: "technical", label: "Техническая документация" },
  { value: "contracts", label: "Договоры и подрядчики" },
  { value: "resident_info", label: "Объявления и памятки для жильцов" },
];

const visibilityOptions: Array<{
  value: HouseDocumentVisibility;
  label: string;
}> = [
  { value: "draft", label: "Черновик" },
  { value: "private", label: "Только для администрации" },
  { value: "published", label: "Опубликован для жильцов" },
];

function getCategoryLabel(category: HouseDocumentCategory) {
  return (
    categoryOptions.find((item) => item.value === category)?.label ?? category
  );
}

function getVisibilityLabel(visibility: HouseDocumentVisibility) {
  return (
    visibilityOptions.find((item) => item.value === visibility)?.label ??
    visibility
  );
}

function getVisibilityClasses(visibility: HouseDocumentVisibility) {
  if (visibility === "published") {
    return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  }

  if (visibility === "private") {
    return "border border-amber-500/20 bg-amber-500/15 text-amber-300";
  }

  return "border border-slate-700 bg-slate-800 text-slate-200";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) {
    return "Размер не указан";
  }

  if (value < 1024) {
    return `${value} Б`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} КБ`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

type FormMode = "create" | "edit";

export function HouseDocumentsWorkspace({
  houseId,
  documents = [],
  startInCreateMode = false,
}: HouseDocumentsWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(startInCreateMode);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [actionLabel, setActionLabel] = useState("Обрабатываем документ...");

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<HouseDocumentCategory>("regulations");
  const [visibility, setVisibility] =
    useState<HouseDocumentVisibility>("draft");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [fileError, setFileError] = useState<string | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  const selectedDocument = useMemo(
    () =>
      selectedDocumentId
        ? documents.find((document) => document.id === selectedDocumentId) ?? null
        : null,
    [documents, selectedDocumentId],
  );

  const formMode: FormMode = selectedDocument ? "edit" : "create";

  const filteredDocuments = documents;

  function resetForm() {
    setTitle("");
    setCategory("regulations");
    setVisibility("draft");
    setDescription("");
    setSelectedFile(null);
    setRemoveAttachment(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setSelectedDocumentId(null);
    setActionError(null);
    setActionLabel("Обрабатываем документ...");
    resetForm();
  }, []);

  function switchToEditMode(document: HouseDocumentListItem) {
    setIsFormOpen(true);
    setSelectedDocumentId(document.id);
    setActionError(null);
    setTitle(document.title);
    setCategory(document.category);
    setVisibility(document.visibility_status);
    setDescription(document.description ?? "");
    setSelectedFile(null);
    setRemoveAttachment(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionLabel(
      selectedFile
        ? "Загружаем и сохраняем документ..."
        : formMode === "edit"
          ? "Обновляем документ..."
          : "Создаем документ...",
    );

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      let uploadedPdfPath = "";
      let uploadedPdfName = "";

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop() ?? "pdf";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${houseId}/documents/${fileName}`;

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

      try {
        const formData = new FormData();
        formData.set("houseId", houseId);
        formData.set("title", title);
        formData.set("category", category);
        formData.set("visibilityStatus", visibility);
        formData.set("description", description);

        if (uploadedPdfPath) {
          formData.set("uploadedPdfPath", uploadedPdfPath);
          formData.set("uploadedPdfName", uploadedPdfName);
        }


        if (formMode === "edit" && selectedDocument) {
          formData.set("documentId", selectedDocument.id);
          formData.set("removeAttachment", removeAttachment ? "true" : "false");

          if (selectedFile) {
          }

          const result = await updateHouseDocument(formData);

          if (result.error) {
            setActionError(result.error);
            return;
          }
        } else {
          if (selectedFile) {
          }

          const result = await createHouseDocument(formData);

          if (result.error) {
            setActionError(result.error);
            return;
          }
        }

        closeForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : formMode === "edit"
              ? "Не удалось обновить документ."
              : "Не удалось создать документ.",
        );
      }
    });
  }

  function handleDeleteDocument() {
    if (!selectedDocument) {
      return;
    }

    setIsDeleteConfirmOpen(true);
  }

  function handleConfirmDeleteDocument() {
    if (!selectedDocument) {
      setIsDeleteConfirmOpen(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setActionError(null);

    startTransition(async () => {
      try {
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
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Не удалось удалить документ.",
        );
      }
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
      {shouldRenderForm ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {formMode === "edit"
                  ? "Редактирование документа"
                  : "Новый документ"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {formMode === "edit"
                  ? "Карточка открыта в верхней форме. Здесь можно изменить данные, заменить файл или удалить документ."
                  : "Новый документ автоматически создается как черновик. Загрузи один PDF файл перед сохранением."}
              </p>
            </div>

            <button
  type="button"
  onClick={closeForm}
  aria-label="Закрыть форму"
  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-xl font-medium text-white transition hover:bg-slate-800"
>
  ×
</button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Название документа
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: Протокол собрания от 10.04.2026"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Категория
              </label>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as HouseDocumentCategory)
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {formMode === "create" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
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
                  className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                />

                <p className="mt-2 text-xs text-slate-500">
                  {getSinglePdfHintMessage()}
                </p>

                {fileError ? (
                  <div className="mt-2 text-xs text-red-400">
                    {fileError}
                  </div>
                ) : null}

                {fileError ? (
                  <div className="mt-2 text-xs text-red-400">
                    {fileError}
                  </div>
                ) : null}

                {fileError ? (
                  <div className="mt-2 text-xs text-red-400">
                    {fileError}
                  </div>
                ) : null}

                {selectedFile ? (
                  <div className="mt-2 text-xs text-slate-400">
                    Будет загружен файл: {selectedFile.name} (
                    {formatFileSize(selectedFile.size)})
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Описание
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Краткое описание документа, состава, периода или назначения"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              />
            </div>

            {formMode === "edit" ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">
                      Файл документа
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      Можно загрузить новый файл, чтобы заменить текущий.
                    </p>
                  </div>

                  {hasExistingAttachment && selectedDocument ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium text-white">
                          Текущий файл:{" "}
                          {selectedDocument.original_file_name ?? "Без имени"}
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                          <span>
                            Размер: {formatFileSize(selectedDocument.file_size_bytes)}
                          </span>
                          <span>
                            Загружен: {formatDateTime(selectedDocument.uploaded_at)}
                          </span>
                          <span>
                            Тип: {selectedDocument.mime_type || "Не указан"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {selectedDocument.signed_file_url ? (
                            <a
                              href={selectedDocument.signed_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                            >
                              Открыть текущий файл
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Signed URL сейчас недоступен.
                            </span>
                          )}

                          <label className="inline-flex items-center gap-2 text-sm text-red-300">
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
                              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                            />
                            Удалить текущий файл
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
                      У этого документа пока нет загруженного файла.
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Загрузить новый файл
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
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
                      className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                    />

                    {fileError ? (
                  <div className="mt-2 text-xs text-red-400">
                    {fileError}
                  </div>
                ) : null}

                {selectedFile ? (
                      <div className="mt-2 text-xs text-slate-400">
                        Будет загружен файл: {selectedFile.name} (
                        {formatFileSize(selectedFile.size)})
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                {actionError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending || Boolean(fileError)}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  {isPending ? "Сохраняем..." : "Сохранить"}
                </button>

                {formMode === "edit" &&
                selectedDocument?.visibility_status !== "published" ? (
                  <button
                    type="button"
                    onClick={handleDeleteDocument}
                    disabled={isPending || Boolean(fileError)}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-800 bg-red-950/30 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/50 disabled:opacity-60"
                  >
                    Удалить
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {formMode === "edit" &&
                selectedDocument?.visibility_status !== "published" ? (
                  <button
                    type="button"
                    disabled={isPending || Boolean(fileError)}
                    onClick={() => {
                      setVisibility("published");
                      setTimeout(() => {
                        const form = document.querySelector("form");
                        if (form instanceof HTMLFormElement) {
                          form.requestSubmit();
                        }
                      }, 0);
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-700 bg-emerald-950/40 px-5 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-950/70 disabled:opacity-60"
                  >
                    Подтвердить
                  </button>
                ) : null}

                {formMode === "edit" &&
                selectedDocument?.visibility_status === "published" ? (
                  <button
                    type="button"
                    onClick={handleDeleteDocument}
                    disabled={isPending || Boolean(fileError)}
                    className="inline-flex items-center justify-center rounded-2xl border border-amber-700 bg-amber-950/40 px-5 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-950/70 disabled:opacity-60"
                  >
                    Архивировать
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Найдено: {filteredDocuments.length}
        </div>



      {filteredDocuments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">
          Документы пока не найдены. Создай первый документ через кнопку
          «Новый документ».
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((document) => {
            const isSelected = document.id === selectedDocumentId && isFormOpen;
            const hasAttachment = document.attachment_status === "uploaded";

            return (
              <button
                key={document.id}
                type="button"
                onClick={() => switchToEditMode(document)}
                className={[
                  "w-full rounded-3xl border bg-slate-900 p-5 text-left transition",
                  isSelected
                    ? "border-white/30 ring-1 ring-white/20"
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/90",
                ].join(" ")}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-base font-semibold text-white">
                        {document.title}
                      </div>

                      {isSelected ? (
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                          Открыт в форме
                        </span>
                      ) : null}

                      {hasAttachment ? (
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
                          Файл прикреплен
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-sm text-slate-400">
                      {getCategoryLabel(document.category)}
                    </div>

                    <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
                      {document.description || "Описание документа пока не добавлено."}
                    </div>

                    {hasAttachment ? (
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                        <span>
                          Файл: {document.original_file_name || "Без имени"}
                        </span>
                        <span>
                          Размер: {formatFileSize(document.file_size_bytes)}
                        </span>
                        <span>
                          Загружен: {formatDateTime(document.uploaded_at)}
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                      <span>Создан: {formatDate(document.created_at)}</span>
                      <span>Обновлен: {formatDateTime(document.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getVisibilityClasses(document.visibility_status)}`}
                    >
                      {getVisibilityLabel(document.visibility_status)}
                    </span>

                    <span className="text-xs text-slate-500">
                      Нажми для редактирования
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
        open={isDeleteConfirmOpen}
        tone="warning"
        title="Перенести в архив?"
        description={
          selectedDocument
            ? `После подтверждения документ «${selectedDocument.title}» будет перенесен в архив и скрыт с сайта.`
            : "После подтверждения документ будет перенесен в архив и скрыт с сайта."
        }
        confirmLabel="Архивировать"
        pendingLabel="Архивируем..."
        isPending={isPending}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteDocument}
      />
    </div>
  );
}
