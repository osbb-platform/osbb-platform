"use client";

import {
  startTransition,
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { validateMultiplePdfFiles } from "@/src/shared/utils/validators/pdfUpload";

type PlanWorkspaceState = {
  error: string | null;
  planItems: unknown[] | null;
};

const initialState: PlanWorkspaceState = {
  error: null,
  planItems: null,
};

type SectionStatus = "draft" | "in_review" | "published" | "archived";
type PlanTaskStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "archived";
type PlanTaskPriority = "high" | "medium" | "low";
type PlanTaskDateMode = "deadline" | "range";
type PublishablePlanTaskStatus = "planned" | "in_progress" | "completed";

type WorkspaceTab = "active" | "draft" | "archive";
type WorkspaceMode = "idle" | "create" | "edit";
type SubmitIntent = "save" | "delete" | "publish" | "archive";

type PlanAttachment = {
  id: string;
  path: string;
  fileName?: string;
  kind: "image" | "pdf";
  createdAt: string;
};

type PlanTask = {
  id: string;
  title: string;
  description: string;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  dateMode: PlanTaskDateMode;
  deadlineAt: string | null;
  startDate: string | null;
  endDate: string | null;
  contractor: string | null;
  images: PlanAttachment[];
  documents: PlanAttachment[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type Props = {
  canChangeWorkflowStatus?: boolean;
  houseId: string;
  houseSlug: string;
  section: {
    id: string;
    title: string | null;
    status: SectionStatus;
    content: Record<string, unknown>;
  };
};

function createTaskId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyTask(): PlanTask {
  const now = new Date().toISOString();

  return {
    id: createTaskId(),
    title: "",
    description: "",
    status: "draft",
    priority: "medium",
    dateMode: "deadline",
    deadlineAt: "",
    startDate: "",
    endDate: "",
    contractor: "",
    images: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

function normalizePlanTasks(content: Record<string, unknown>): PlanTask[] {
  const source = Array.isArray(content.items) ? content.items : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") {
        return createEmptyTask();
      }
      const raw = item as Record<string, unknown>;

      return {
        id: String(raw.id ?? createTaskId()),
        title: String(raw.title ?? ""),
        description: String(raw.description ?? ""),
        status:
          raw.status === "planned" ||
          raw.status === "in_progress" ||
          raw.status === "completed" ||
          raw.status === "archived"
            ? raw.status
            : "draft",
        priority:
          raw.priority === "high" ||
          raw.priority === "medium" ||
          raw.priority === "low"
            ? raw.priority
            : "medium",
        dateMode: raw.dateMode === "range" ? "range" : "deadline",
        deadlineAt: String(raw.deadlineAt ?? ""),
        startDate: String(raw.startDate ?? ""),
        endDate: String(raw.endDate ?? ""),
        contractor: String(raw.contractor ?? ""),
        images: Array.isArray(raw.images)
          ? (raw.images as PlanAttachment[])
          : [],
        documents: Array.isArray(raw.documents)
          ? (raw.documents as PlanAttachment[])
          : [],
        createdAt: String(raw.createdAt ?? new Date().toISOString()),
        updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
        archivedAt: raw.archivedAt ? String(raw.archivedAt) : null,
      } satisfies PlanTask;
    })
    .filter((item): item is PlanTask => Boolean(item));
}

function getDatePreview(task: PlanTask) {
  if (task.dateMode === "deadline") {
    return task.deadlineAt || "Без дедлайна";
  }

  return `${task.startDate || "?"} → ${task.endDate || "?"}`;
}

function getStatusOptions() {
  return [
    { value: "planned", label: "Запланировано" },
    { value: "in_progress", label: "В работе" },
    { value: "completed", label: "Выполнено" },
  ] as const;
}

function getFileLabel(fileName: string | undefined, fallback: string) {
  return fileName?.trim() || fallback;
}

export function HousePlanWorkspace({
  houseId,
  houseSlug,
  section,
  canChangeWorkflowStatus,
}: Props) {
  const workflowAccessGranted = Boolean(canChangeWorkflowStatus);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const [tasks, setTasks] = useState<PlanTask[]>(
    normalizePlanTasks(section.content),
  );

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanTask>(createEmptyTask());
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>("save");
  const [confirmAction, setConfirmAction] = useState<"publish" | "delete" | "archive" | null>(null);
  const [draftPublishStatus, setDraftPublishStatus] = useState<PublishablePlanTaskStatus>("planned");
  const [actionLabel, setActionLabel] = useState("Обрабатываем задачу...");

  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<File[]>([]);
const [pdfError, setPdfError] = useState<string | null>(null);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);


  const counters = useMemo(
    () => ({
      active: tasks.filter(
        (item) =>
          item.status === "planned" ||
          item.status === "in_progress" ||
          item.status === "completed",
      ).length,
      draft: tasks.filter((item) => item.status === "draft").length,
      archive: tasks.filter((item) => item.status === "archived").length,
    }),
    [tasks],
  );

  const visibleTasks = useMemo(() => {
    if (activeTab === "active") {
      return tasks.filter(
        (item) =>
          item.status === "planned" ||
          item.status === "in_progress" ||
          item.status === "completed",
      );
    }
    if (activeTab === "archive") {
      return tasks.filter((item) => item.status === "archived");
    }
    return tasks.filter((item) => item.status === "draft");
  }, [tasks, activeTab]);

  function resetWorkspace() {
    setWorkspaceMode("idle");
    setSelectedTaskId(null);
    setDraft(createEmptyTask());
    setDraftPublishStatus("planned");
    setSelectedImageFiles([]);
    setSelectedPdfFiles([]);
    setRemovedImageIds([]);
    setRemovedDocumentIds([]);
    setSubmitIntent("save");
    setConfirmAction(null);

    if (imageInputRef.current) imageInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function openCreateMode() {
    setActiveTab("draft");
    setWorkspaceMode("create");
    setSelectedTaskId(null);
    setDraft(createEmptyTask());
    setDraftPublishStatus("planned");
    setSelectedImageFiles([]);
    setSelectedPdfFiles([]);
    setRemovedImageIds([]);
    setRemovedDocumentIds([]);
    setSubmitIntent("save");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function openEditMode(task: PlanTask) {
    setWorkspaceMode("edit");
    setSelectedTaskId(task.id);
    setDraft(task);
    setDraftPublishStatus(
      task.status === "in_progress"
        ? "in_progress"
        : task.status === "completed"
          ? "completed"
          : "planned",
    );
    setSelectedImageFiles([]);
    setSelectedPdfFiles([]);
    setRemovedImageIds([]);
    setRemovedDocumentIds([]);
    setSubmitIntent("save");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function updateStatus(next: PlanTaskStatus) {
    if (!workflowAccessGranted) return;
    setDraft((prev) => ({
      ...prev,
      status: next,
      archivedAt: next === "archived" ? new Date().toISOString() : null,
    }));
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    setSelectedImageFiles((prev) => {
      const alreadyCount = draft.images.length + prev.length;
      const availableSlots = Math.max(0, 5 - alreadyCount);

      const nextFiles = files.slice(0, availableSlots);

      return [...prev, ...nextFiles];
    });
  }

  function handlePdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const availableSlots = Math.max(0, 2 - draft.documents.length);
    const nextFiles = files.slice(0, availableSlots);

    if (nextFiles.length === 0) {
      setSelectedPdfFiles([]);
      setPdfError(null);
      return;
    }

    const validation = validateMultiplePdfFiles(nextFiles, {
      maxCount: 2,
    });

    if (!validation.isValid) {
      setSelectedPdfFiles([]);
      setPdfError(validation.error);
      event.target.value = "";
      return;
    }

    setPdfError(null);
    setSelectedPdfFiles(nextFiles);
  }

  function clearSelectedImages() {
    setSelectedImageFiles([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function clearSelectedPdfs() {
    setSelectedPdfFiles([]);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function removeExistingImage(attachmentId: string) {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((item) => item.id !== attachmentId),
    }));
    setRemovedImageIds((prev) =>
      prev.includes(attachmentId) ? prev : [...prev, attachmentId],
    );
  }

  function removeExistingDocument(attachmentId: string) {
    setDraft((prev) => ({
      ...prev,
      documents: prev.documents.filter((item) => item.id !== attachmentId),
    }));
    setRemovedDocumentIds((prev) =>
      prev.includes(attachmentId) ? prev : [...prev, attachmentId],
    );
  }

  const nextDraftStatus: PlanTaskStatus =
    submitIntent === "publish"
      ? draftPublishStatus
      : submitIntent === "archive"
        ? "archived"
        : workspaceMode === "create"
          ? "draft"
          : draft.status;

  const normalizedDraft = {
    ...draft,
    status: nextDraftStatus,
    updatedAt: new Date().toISOString(),
    archivedAt:
      nextDraftStatus === "archived" ? draft.archivedAt ?? new Date().toISOString() : null,
  };

  const nextTasksPayload =
    submitIntent === "delete" && workspaceMode === "edit"
      ? tasks.filter((item) => item.id !== normalizedDraft.id)
      : workspaceMode === "create"
        ? [normalizedDraft, ...tasks]
        : tasks.map((item) =>
            item.id === normalizedDraft.id ? normalizedDraft : item,
          );

  async function handleSubmit(formData: FormData) {
    setActionLabel(
      submitIntent === "delete"
        ? "Удаляем задачу..."
        : submitIntent === "publish"
          ? "Публикуем задачу..."
          : submitIntent === "archive"
            ? "Архивируем задачу..."
            : selectedPdfFiles.length > 0 || selectedImageFiles.length > 0
              ? "Загружаем и сохраняем вложения..."
              : workspaceMode === "edit"
                ? "Обновляем задачу..."
                : "Создаем задачу...",
    );

    await formAction(formData);

    startTransition(() => {
      const nextNormalized = nextTasksPayload;

      setTasks(nextNormalized);

      if (submitIntent === "delete") {
        setActiveTab(draft.status === "archived" ? "archive" : "draft");
      } else if (
        normalizedDraft.status === "planned" ||
        normalizedDraft.status === "in_progress" ||
        normalizedDraft.status === "completed"
      ) {
        setActiveTab("active");
      } else if (normalizedDraft.status === "archived") {
        setActiveTab("archive");
      } else {
        setActiveTab("draft");
      }

      resetWorkspace();
      setActionLabel("Обрабатываем задачу...");
    });
  }

  const uploadImageDisabled = draft.images.length >= 5;
  const uploadPdfDisabled = draft.documents.length >= 2;

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-3xl"
      />
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">План работ дома</h2>
            <p className="mt-2 text-sm text-slate-400">
              Управление задачами дома по срокам, приоритетам и этапам выполнения с публикацией для жильцов.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateMode}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Новая задача
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {[
              ["active", "Активные", counters.active],
              ["draft", "Черновики", counters.draft],
              ["archive", "Архив", counters.archive],
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as WorkspaceTab)}
                className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  activeTab === key
                    ? "bg-white text-slate-950"
                    : "border border-slate-700 bg-slate-950/40 text-white"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeTab === key
                      ? "bg-slate-200 text-slate-950"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {workspaceMode !== "idle" ? (
        <form
          ref={formRef}
          action={handleSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <input type="hidden" name="sectionId" value={section.id} />
          <input type="hidden" name="houseId" value={houseId} />
          <input type="hidden" name="houseSlug" value={houseSlug} />
          <input type="hidden" name="title" value="План работ" />
          <input type="hidden" name="status" value="published" />
          <input type="hidden" name="kind" value="plan" />
          <input type="hidden" name="planIntent" value={submitIntent} />
          <input
            type="hidden"
            name="activePlanTaskId"
            value={selectedTaskId ?? normalizedDraft.id}
          />
          <input
            type="hidden"
            name="planPayload"
            value={JSON.stringify({ items: nextTasksPayload })}
          />
          <input
            type="hidden"
            name="removePlanImageIds"
            value={JSON.stringify(removedImageIds)}
          />
          <input
            type="hidden"
            name="removePlanDocumentIds"
            value={JSON.stringify(removedDocumentIds)}
          />

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {workspaceMode === "edit"
                  ? "Редактирование задачи"
                  : "Новая задача"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Новая задача сначала сохраняется как черновик. После сохранения карточку можно открыть повторно и изменить ее статус.
              </p>
            </div>

            <button
              type="button"
              onClick={resetWorkspace}
              aria-label="Закрыть форму"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-xl font-medium text-white transition hover:bg-slate-800"
            >
              ×
            </button>
          </div>

          <div className="grid gap-4">
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Название задачи"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />

            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Описание"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />

            <div>
              <select
                value={draft.priority}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    priority: e.target.value as PlanTaskPriority,
                  }))
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              >
                <option value="high">Красный — срочный приоритет</option>
                <option value="medium">Оранжевый — важная задача</option>
                <option value="low">Серый — обычная задача</option>
              </select>

              <div className="mt-2 text-xs text-slate-400">
                Этот приоритет будет виден на карточке и поможет быстро ориентироваться в списке задач.
              </div>
            </div>

            <select
              value={draft.dateMode}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  dateMode: e.target.value as PlanTaskDateMode,
                }))
              }
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="deadline">Дедлайн</option>
              <option value="range">Период</option>
            </select>

            {draft.dateMode === "deadline" ? (
              <input
                type="date"
                value={draft.deadlineAt ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    deadlineAt: e.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="date"
                  value={draft.startDate ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
                <input
                  type="date"
                  value={draft.endDate ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>
            )}

            <input
              value={draft.contractor ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  contractor: e.target.value,
                }))
              }
              placeholder="Подрядчик"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    Фото задачи
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    До 5 изображений.
                  </p>
                </div>

                {draft.images.length > 0 ? (
                  <div className="space-y-2">
                    {draft.images.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm text-slate-300">
                          🖼 Фото {index + 1}: {getFileLabel(item.fileName, item.path)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(item.id)}
                          className="rounded-2xl border border-red-900 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950/40"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <input
                  ref={imageInputRef}
                  type="file"
                  name="planImageFiles"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="plan-image-files-input"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="plan-image-files-input"
                    className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      uploadImageDisabled
                        ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                        : "border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Выбрать
                  </label>

                  {selectedImageFiles.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearSelectedImages}
                      className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Очистить выбор
                    </button>
                  ) : null}
                </div>

                {selectedImageFiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedImageFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300"
                      >
                        🖼 Новый файл: {file.name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    PDF документы
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    До 2 PDF файлов.
                  </p>
                </div>

                {draft.documents.length > 0 ? (
                  <div className="space-y-2">
                    {draft.documents.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm text-slate-300">
                          📄 PDF {index + 1}: {getFileLabel(item.fileName, item.path)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingDocument(item.id)}
                          className="rounded-2xl border border-red-900 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950/40"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <input
                  ref={pdfInputRef}
                  type="file"
                  name="planPdfFiles"
                  accept="application/pdf"
                  multiple
                  onChange={handlePdfChange}
                  className="hidden"
                  id="plan-pdf-files-input"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="plan-pdf-files-input"
                    className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      uploadPdfDisabled
                        ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                        : "border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Выбрать
                  </label>

                  {pdfError ? (
                  <div className="mt-2 text-xs text-red-400">
                    {pdfError}
                  </div>
                ) : null}

                {selectedPdfFiles.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearSelectedPdfs}
                      className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Очистить выбор
                    </button>
                  ) : null}
                </div>

                {selectedPdfFiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPdfFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300"
                      >
                        📄 Новый файл: {file.name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {workspaceMode === "edit" && draft.status === "draft" ? (
              <div>
                <select
                  value={draftPublishStatus}
                  onChange={(e) =>
                    setDraftPublishStatus(
                      e.target.value as PublishablePlanTaskStatus,
                    )
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                >
                  {getStatusOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-slate-400">
                  Этот статус будет применен после подтверждения и публикации задачи.
                </div>
              </div>
            ) : workspaceMode === "edit" && draft.status !== "draft" ? (
              <select
                value={draft.status}
                onChange={(e) =>
                  updateStatus(e.target.value as PlanTaskStatus)
                }
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              >
                {getStatusOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="overflow-x-auto">
              <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
                <div className="flex flex-nowrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    onClick={() => setSubmitIntent("save")}
                    className="inline-flex min-h-16 items-center justify-center rounded-3xl bg-white px-10 py-5 text-2xl font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "save" ? "Сохраняем..." : "Сохранить"}
                  </button>

                  {workspaceMode === "edit" &&
                  (draft.status === "draft" || draft.status === "archived") ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction("delete")}
                      className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-red-900 px-10 py-5 text-2xl font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "delete" ? "Удаляем..." : "Удалить"}
                    </button>
                  ) : null}
                </div>

                {workspaceMode === "edit" && draft.status === "draft" ? (
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction("publish")}
                      className="inline-flex min-h-16 items-center justify-center rounded-3xl bg-emerald-500 px-10 py-5 text-2xl font-medium text-white transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "publish" ? "Подтверждаем..." : "Подтвердить"}
                    </button>
                  </div>
                ) : workspaceMode === "edit" &&
                draft.status !== "draft" &&
                draft.status !== "archived" ? (
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction("archive")}
                      className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-amber-700 px-10 py-5 text-2xl font-medium text-amber-300 transition hover:bg-amber-950/30 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "archive" ? "Архивируем..." : "Архивировать"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {state.error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {state.error}
              </div>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="space-y-4">
        {visibleTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-sm leading-6 text-slate-400">
            {activeTab === "active"
              ? "Сейчас нет активных задач. После подтверждения и запуска работ карточки появятся здесь."
              : activeTab === "draft"
                ? "Черновиков пока нет. Новая задача появится здесь сразу после сохранения."
                : "Архив задач пока пуст. Перенесенные карточки будут отображаться здесь."}
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isSelected =
              workspaceMode === "edit" && selectedTaskId === task.id;

            const priorityLabel =
              task.priority === "high"
                ? "Срочный"
                : task.priority === "medium"
                  ? "Важный"
                  : "Обычный";

            const priorityClasses =
              task.priority === "high"
                ? "border-red-500/20 bg-red-500/15 text-red-300"
                : task.priority === "medium"
                  ? "border-amber-500/20 bg-amber-500/15 text-amber-300"
                  : "border-slate-700 bg-slate-900 text-slate-300";

            const statusLabel =
              task.status === "planned"
                ? "Запланировано"
                : task.status === "in_progress"
                  ? "В работе"
                  : task.status === "completed"
                    ? "Выполнено"
                    : task.status === "archived"
                      ? "Архив"
                      : "Черновик";

            const statusClasses =
              task.status === "planned"
                ? "border-sky-500/20 bg-sky-500/15 text-sky-300"
                : task.status === "in_progress"
                  ? "border-amber-500/20 bg-amber-500/15 text-amber-300"
                  : task.status === "completed"
                    ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                    : task.status === "archived"
                      ? "border-slate-700 bg-slate-800 text-slate-300"
                      : "border-violet-500/20 bg-violet-500/15 text-violet-300";

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => openEditMode(task)}
                className={`block w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-white bg-slate-800"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${priorityClasses}`}
                  >
                    {priorityLabel}
                  </span>

                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${statusClasses}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-3 text-lg font-semibold text-white">
                  {task.title || "Задача без названия"}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {task.description || "Описание задачи пока не заполнено."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
                  <span>{getDatePreview(task)}</span>
                  {task.contractor ? <span>{task.contractor}</span> : null}
                  <span>
                    Фото: {task.images.length} · PDF: {task.documents.length}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title="Удалить черновик задачи?"
        description="Черновик будет удален без возможности восстановления."
        confirmLabel="Удалить задачу"
        pendingLabel="Удаляем..."
        tone="destructive"
        isPending={isPending && submitIntent === "delete"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          setSubmitIntent("delete");
          requestAnimationFrame(() => {
            formRef.current?.requestSubmit();
          });
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Подтвердить публикацию задачи?"
        description="После подтверждения задача станет видимой на публичной странице дома."
        confirmLabel="Подтвердить задачу"
        pendingLabel="Подтверждаем..."
        tone="publish"
        isPending={isPending && submitIntent === "publish"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          setSubmitIntent("publish");
          requestAnimationFrame(() => {
            formRef.current?.requestSubmit();
          });
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перенести задачу в архив?"
        description="После архивации задача исчезнет из активного списка и публичной страницы дома, но останется доступной в архиве."
        confirmLabel="Архивировать задачу"
        pendingLabel="Архивируем..."
        tone="warning"
        isPending={isPending && submitIntent === "archive"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          setSubmitIntent("archive");
          requestAnimationFrame(() => {
            formRef.current?.requestSubmit();
          });
        }}
      />

    </div>
  );
}
