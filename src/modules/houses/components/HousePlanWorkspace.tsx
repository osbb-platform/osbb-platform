"use client";

import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import type { AdminHousePlanSnapshot } from "@/src/modules/houses/services/getAdminHousePlan";
import { validateMultiplePdfFiles } from "@/src/shared/utils/validators/pdfUpload";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

type PlanTaskStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "archived";
type PlanTaskPriority = "high" | "medium" | "low";
type PlanTaskDateMode = "deadline" | "range";
type PublishablePlanTaskStatus = "planned" | "in_progress" | "completed";

const PLAN_ARCHIVE_YEAR_START = 2016;
const PLAN_ARCHIVE_YEAR_END = 2026;
const PLAN_ARCHIVE_YEARS = Array.from(
  { length: PLAN_ARCHIVE_YEAR_END - PLAN_ARCHIVE_YEAR_START + 1 },
  (_, index) => PLAN_ARCHIVE_YEAR_START + index,
);

type WorkspaceTab = "active" | "draft" | "archive";
type WorkspaceMode = "idle" | "create" | "edit";
type SubmitIntent = "save" | "delete" | "publish" | "archive";

type PlanAttachment = {
  id: string;
  fieldKey?: string;
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
  archiveYear: number;
  lockVersion: number;
};

type UploadedPlanFile = {
  bucket: string;
  path: string;
  originalName: string;
  mimeType: string | null;
  size: number;
};

type CommandResultWithLock = {
  lock_version?: number;
  lockVersion?: number;
};

type Props = {
  canChangeWorkflowStatus?: boolean;
  houseId: string;
  houseSlug: string;
  plan: AdminHousePlanSnapshot;
};

function createTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `00000000-0000-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;
}

function normalizeArchiveYear(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (
    Number.isInteger(parsed) &&
    parsed >= PLAN_ARCHIVE_YEAR_START &&
    parsed <= PLAN_ARCHIVE_YEAR_END
  ) {
    return parsed;
  }

  return PLAN_ARCHIVE_YEAR_END;
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
    archiveYear: PLAN_ARCHIVE_YEAR_END,
    lockVersion: 1,
  };
}

function normalizePlanTasks(plan: AdminHousePlanSnapshot): PlanTask[] {
  return plan.tasks.map((task) => ({
    id: task.id,
    title: task.content.title,
    description: task.content.description,
    status: task.status,
    priority: task.content.priority,
    dateMode: task.content.dateMode,
    deadlineAt: task.content.deadlineAt ?? "",
    startDate: task.content.startDate ?? "",
    endDate: task.content.endDate ?? "",
    contractor: task.content.contractor ?? "",
    images: task.content.images.map((file) => ({
      id: file.fieldKey,
      fieldKey: file.fieldKey,
      path: file.path,
      fileName: file.fileName,
      kind: "image",
      createdAt: file.createdAt,
    })),
    documents: task.content.documents.map((file) => ({
      id: file.fieldKey,
      fieldKey: file.fieldKey,
      path: file.path,
      fileName: file.fileName,
      kind: "pdf",
      createdAt: file.createdAt,
    })),
    createdAt: task.content.createdAt,
    updatedAt: task.content.updatedAt,
    archivedAt: task.content.archivedAt,
    archiveYear: normalizeArchiveYear(task.content.archiveYear),
    lockVersion: task.lockVersion,
  }));
}

function getDatePreview(task: PlanTask) {
  if (task.dateMode === "deadline") {
    return task.deadlineAt || "Без дедлайну";
  }

  return `${task.startDate || "?"} → ${task.endDate || "?"}`;
}

function getStatusOptions() {
  return [
    { value: "planned", label: "Заплановано" },
    { value: "in_progress", label: "В роботі" },
    { value: "completed", label: "Виконано" },
  ] as const;
}

function getFileLabel(fileName: string | undefined, fallback: string) {
  return fileName?.trim() || fallback;
}

function createPlanUploadToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createPlanUploadFileName(fileExt: string, index: number) {
  return `${createPlanUploadToken()}-${index}.${fileExt}`;
}

function getResultLockVersion(result: unknown, fallback: number) {
  if (!result || typeof result !== "object") {
    return fallback;
  }

  const record = result as CommandResultWithLock;

  if (typeof record.lock_version === "number") {
    return record.lock_version;
  }

  if (typeof record.lockVersion === "number") {
    return record.lockVersion;
  }

  return fallback;
}

function taskPayload(task: PlanTask) {
  return {
    title: task.title,
    description: task.description,
    dateMode: task.dateMode,
    deadlineAt: task.dateMode === "deadline" ? task.deadlineAt : null,
    startDate: task.dateMode === "range" ? task.startDate : null,
    endDate: task.dateMode === "range" ? task.endDate : null,
    taskStatus:
      task.status === "draft" || task.status === "archived"
        ? "planned"
        : task.status,
    priority: task.priority,
    contractor: task.contractor,
    archiveYear: task.archiveYear,
  };
}

export function HousePlanWorkspace({
  houseId,
  houseSlug,
  plan,
  canChangeWorkflowStatus,
}: Props) {
  const workflowAccessGranted = Boolean(canChangeWorkflowStatus);
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const [tasks, setTasks] = useState<PlanTask[]>(() => normalizePlanTasks(plan));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanTask>(createEmptyTask());
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>("save");
  const [confirmAction, setConfirmAction] = useState<"publish" | "delete" | "archive" | null>(null);
  const [draftPublishStatus, setDraftPublishStatus] = useState<PublishablePlanTaskStatus>("planned");
  const [actionLabel, setActionLabel] = useState("Обробляємо завдання...");
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
    setPdfError(null);
    setSubmitIntent("save");
    setConfirmAction(null);
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
    setPdfError(null);
    setSubmitIntent("save");
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
    setPdfError(null);
    setSubmitIntent("save");
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
      return [...prev, ...files.slice(0, availableSlots)];
    });

    event.target.value = "";
  }

  function handlePdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const availableSlots = Math.max(0, 2 - draft.documents.length);
    const nextFiles = files.slice(0, availableSlots);

    if (nextFiles.length === 0) {
      setSelectedPdfFiles([]);
      setPdfError(null);
      event.target.value = "";
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
    event.target.value = "";
  }

  function clearSelectedImages() {
    setSelectedImageFiles([]);
  }

  function clearSelectedPdfs() {
    setSelectedPdfFiles([]);
    setPdfError(null);
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

  async function uploadSelectedFiles(taskId: string): Promise<UploadedPlanFile[] | null> {
    if (selectedImageFiles.length === 0 && selectedPdfFiles.length === 0) {
      return [];
    }

    const supabase = createSupabaseBrowserClient();
    const uploadedFiles: UploadedPlanFile[] = [];

    for (let index = 0; index < selectedImageFiles.length; index += 1) {
      const file = selectedImageFiles[index];
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const fileName = createPlanUploadFileName(fileExt, index);
      const filePath = `${houseId}/${taskId}/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("house-plan-media")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        return null;
      }

      uploadedFiles.push({
        bucket: "house-plan-media",
        path: filePath,
        originalName: file.name,
        mimeType: file.type || null,
        size: file.size,
      });
    }

    for (let index = 0; index < selectedPdfFiles.length; index += 1) {
      const file = selectedPdfFiles[index];
      const fileExt = file.name.split(".").pop() ?? "pdf";
      const fileName = createPlanUploadFileName(fileExt, index);
      const filePath = `${houseId}/${taskId}/documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("house-plan-documents")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || "application/pdf",
        });

      if (uploadError) {
        return null;
      }

      uploadedFiles.push({
        bucket: "house-plan-documents",
        path: filePath,
        originalName: file.name,
        mimeType: file.type || "application/pdf",
        size: file.size,
      });
    }

    return uploadedFiles;
  }

  async function submitTask(intent: SubmitIntent) {
    setSubmitIntent(intent);
    setActionLabel(
      intent === "delete"
        ? "Видаляємо завдання..."
        : intent === "publish"
          ? "Публікуємо завдання..."
          : intent === "archive"
            ? "Архівуємо завдання..."
            : selectedPdfFiles.length > 0 || selectedImageFiles.length > 0
              ? "Завантажуємо та зберігаємо вкладення..."
              : workspaceMode === "edit"
                ? "Оновлюємо завдання..."
                : "Створюємо завдання...",
    );

    const activeTaskId = selectedTaskId ?? draft.id;
    const fieldKeysToRemove = [...removedImageIds, ...removedDocumentIds];

    if (intent === "delete") {
      const deleted = await dispatch({
        type: "plan.delete",
        houseId,
        payload: {
          id: activeTaskId,
          lockVersion: draft.lockVersion,
        },
      });

      if (!deleted) return;

      setTasks((prev) => prev.filter((item) => item.id !== activeTaskId));
      resetWorkspace();
      return;
    }

    if (intent === "publish") {
      const published = await dispatch({
        type: "plan.publish",
        houseId,
        payload: {
          id: activeTaskId,
          lockVersion: draft.lockVersion,
          taskStatus: draftPublishStatus,
        },
      });

      if (!published) return;

      setTasks((prev) =>
        prev.map((item) =>
          item.id === activeTaskId
            ? {
                ...item,
                status: draftPublishStatus,
                lockVersion: getResultLockVersion(published, item.lockVersion + 1),
              }
            : item,
        ),
      );
      setActiveTab("active");
      resetWorkspace();
      return;
    }

    if (intent === "archive") {
      const archived = await dispatch({
        type: "plan.archive",
        houseId,
        payload: {
          id: activeTaskId,
          lockVersion: draft.lockVersion,
        },
      });

      if (!archived) return;

      setTasks((prev) =>
        prev.map((item) =>
          item.id === activeTaskId
            ? {
                ...item,
                status: "archived",
                archivedAt: new Date().toISOString(),
                lockVersion: getResultLockVersion(archived, item.lockVersion + 1),
              }
            : item,
        ),
      );
      setActiveTab("archive");
      resetWorkspace();
      return;
    }

    const uploadedFiles =
      workspaceMode === "create" ? await uploadSelectedFiles(activeTaskId) : [];

    if (!uploadedFiles) {
      return;
    }

    if (workspaceMode === "create") {
      const created = await dispatch({
        type: "plan.create",
        houseId,
        payload: {
          id: activeTaskId,
          ...taskPayload(draft),
          files: uploadedFiles,
        },
      });

      if (!created) return;

      setTasks((prev) => [
        {
          ...draft,
          id: activeTaskId,
          lockVersion: getResultLockVersion(created, 1),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActiveTab("draft");
      resetWorkspace();
      return;
    }

    const updated = await dispatch({
      type: "plan.update",
      houseId,
      payload: {
        id: activeTaskId,
        lockVersion: draft.lockVersion,
        ...taskPayload(draft),
      },
    });

    if (!updated) return;

    let nextLockVersion = getResultLockVersion(updated, draft.lockVersion + 1);

    if (fieldKeysToRemove.length > 0) {
      const removed = await dispatch({
        type: "plan.removeFiles",
        houseId,
        payload: {
          id: activeTaskId,
          lockVersion: nextLockVersion,
          fieldKeys: fieldKeysToRemove,
        },
      });

      if (!removed) return;

      nextLockVersion = getResultLockVersion(removed, nextLockVersion + 1);
    }

    const updateUploadedFiles = await uploadSelectedFiles(activeTaskId);

    if (!updateUploadedFiles) {
      return;
    }

    if (updateUploadedFiles.length > 0) {
      const added = await dispatch({
        type: "plan.addFiles",
        houseId,
        payload: {
          id: activeTaskId,
          lockVersion: nextLockVersion,
          files: updateUploadedFiles,
        },
      });

      if (!added) return;

      nextLockVersion = getResultLockVersion(added, nextLockVersion + 1);
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === activeTaskId
          ? {
              ...draft,
              id: activeTaskId,
              lockVersion: nextLockVersion,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    if (
      draft.status === "planned" ||
      draft.status === "in_progress" ||
      draft.status === "completed"
    ) {
      setActiveTab("active");
    } else if (draft.status === "archived") {
      setActiveTab("archive");
    } else {
      setActiveTab("draft");
    }

    resetWorkspace();
  }

  const uploadImageDisabled = draft.images.length + selectedImageFiles.length >= 5;
  const uploadPdfDisabled = draft.documents.length + selectedPdfFiles.length >= 2;

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-3xl"
      />

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--cms-text)]">План робіт будинку</h2>
            <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
              Керування завданнями будинку за строками, пріоритетами та етапами виконання з публікацією для мешканців.
            </p>
          </div>

          <button type="button" onClick={openCreateMode} className={adminPrimaryButtonClass}>
            Нове завдання
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {[
              ["active", "Активні", counters.active],
              ["draft", "Чернетки", counters.draft],
              ["archive", "Архів", counters.archive],
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as WorkspaceTab)}
                className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  activeTab === key
                    ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                    : "border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)]"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeTab === key
                      ? "bg-[var(--cms-tab-active-count-bg)] text-[var(--cms-tab-active-text)]"
                      : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]"
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
        <div className={`${adminSurfaceClass} p-6`}>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--cms-text)]">
                {workspaceMode === "edit" ? "Редагування завдання" : "Нове завдання"}
              </h3>
              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Нове завдання спочатку зберігається як чернетка. Після збереження картку можна повторно відкрити та змінити її статус.
              </p>
            </div>

            <button
              type="button"
              onClick={resetWorkspace}
              aria-label="Закрити форму"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] text-xl font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
            >
              ×
            </button>
          </div>

          <div className="grid gap-4">
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Назва завдання"
              className={adminInputClass}
            />

            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Опис"
              className={adminInputClass}
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
                className={adminInputClass}
              >
                <option value="high">Червоний — терміновий пріоритет</option>
                <option value="medium">Помаранчевий — важливе завдання</option>
                <option value="low">Сірий — звичайне завдання</option>
              </select>
              <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
                Цей пріоритет буде видно на картці та допоможе швидко орієнтуватися у списку завдань.
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
              className={adminInputClass}
            >
              <option value="deadline">Кінцевий термін</option>
              <option value="range">Період</option>
            </select>

            {draft.dateMode === "deadline" ? (
              <input
                type="date"
                value={draft.deadlineAt ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, deadlineAt: e.target.value }))}
                className={adminInputClass}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="date"
                  value={draft.startDate ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                  className={adminInputClass}
                />
                <input
                  type="date"
                  value={draft.endDate ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                  className={adminInputClass}
                />
              </div>
            )}

            <input
              value={draft.contractor ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, contractor: e.target.value }))}
              placeholder="Підрядник"
              className={adminInputClass}
            />

            <div>
              <select
                value={draft.archiveYear}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    archiveYear: normalizeArchiveYear(e.target.value),
                  }))
                }
                className={adminInputClass}
              >
                {PLAN_ARCHIVE_YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
                Рік використовується для групування завдання в публічному архіві після архівації.
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
              <div className="text-sm font-medium text-[var(--cms-text)]">Фото завдання</div>
              <p className="mt-1 text-sm text-[var(--cms-text-muted)]">До 5 зображень.</p>

              {draft.images.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {draft.images.map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-[var(--cms-text)]">
                        🖼 Фото {index + 1}: {getFileLabel(item.fileName, item.path)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingImage(item.id)}
                        className="rounded-2xl border border-[var(--cms-danger-border)] px-3 py-2 text-xs font-medium text-[var(--cms-danger-text)] transition hover:opacity-90"
                      >
                        Видалити
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="plan-image-files-input"
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label
                  htmlFor="plan-image-files-input"
                  className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    uploadImageDisabled
                      ? "pointer-events-none cursor-not-allowed border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text-soft)]"
                      : "border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text)] hover:bg-[var(--cms-pill-bg)]"
                  }`}
                >
                  Обрати
                </label>

                {selectedImageFiles.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelectedImages}
                    className="rounded-2xl border border-[var(--cms-border-strong)] px-4 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                  >
                    Очистити вибір
                  </button>
                ) : null}
              </div>

              {selectedImageFiles.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {selectedImageFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 text-sm text-[var(--cms-text)]">
                      🖼 Новий файл: {file.name}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
              <div className="text-sm font-medium text-[var(--cms-text)]">PDF документи</div>
              <p className="mt-1 text-sm text-[var(--cms-text-muted)]">До 2 PDF файлів.</p>

              {draft.documents.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {draft.documents.map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-[var(--cms-text)]">
                        📄 PDF {index + 1}: {getFileLabel(item.fileName, item.path)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingDocument(item.id)}
                        className="rounded-2xl border border-[var(--cms-danger-border)] px-3 py-2 text-xs font-medium text-[var(--cms-danger-text)] transition hover:opacity-90"
                      >
                        Видалити
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handlePdfChange}
                className="hidden"
                id="plan-pdf-files-input"
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label
                  htmlFor="plan-pdf-files-input"
                  className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    uploadPdfDisabled
                      ? "pointer-events-none cursor-not-allowed border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text-soft)]"
                      : "border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text)] hover:bg-[var(--cms-pill-bg)]"
                  }`}
                >
                  Обрати
                </label>

                {selectedPdfFiles.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelectedPdfs}
                    className="rounded-2xl border border-[var(--cms-border-strong)] px-4 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                  >
                    Очистити вибір
                  </button>
                ) : null}
              </div>

              {pdfError ? <div role="alert" className="mt-2 text-xs text-[var(--cms-danger-text)]">{pdfError}</div> : null}

              {selectedPdfFiles.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {selectedPdfFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 text-sm text-[var(--cms-text)]">
                      📄 Новий файл: {file.name}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {workspaceMode === "edit" && draft.status === "draft" ? (
              <div>
                <select
                  value={draftPublishStatus}
                  onChange={(e) => setDraftPublishStatus(e.target.value as PublishablePlanTaskStatus)}
                  className={adminInputClass}
                >
                  {getStatusOptions().map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
                  Цей статус буде застосовано після підтвердження та публікації завдання.
                </div>
              </div>
            ) : workspaceMode === "edit" && draft.status !== "draft" ? (
              <select
                value={draft.status}
                onChange={(e) => updateStatus(e.target.value as PlanTaskStatus)}
                className={adminInputClass}
              >
                {getStatusOptions().map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : null}

            <div className="overflow-x-auto">
              <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
                <div className="flex flex-nowrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void submitTask("save")}
                    className={`${adminPrimaryButtonClass} min-h-16 px-10 py-5 text-2xl disabled:opacity-60`}
                  >
                    {isPending && submitIntent === "save" ? "Зберігаємо..." : "Зберегти"}
                  </button>

                  {workspaceMode === "edit" &&
                  (draft.status === "draft" || draft.status === "archived") ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction("delete")}
                      className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-[var(--cms-danger-border)] px-10 py-5 text-2xl font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "delete" ? "Видаляємо..." : "Видалити"}
                    </button>
                  ) : null}
                </div>

                {workspaceMode === "edit" && draft.status === "draft" ? (
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction("publish")}
                      className="inline-flex min-h-16 items-center justify-center rounded-3xl bg-[var(--cms-success-bg)] border border-[var(--cms-success-border)] px-10 py-5 text-2xl font-medium text-[var(--cms-success-text)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "publish" ? "Підтверджуємо..." : "Підтвердити"}
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
                      className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-[var(--cms-warning-border)] px-10 py-5 text-2xl font-medium text-[var(--cms-warning-text)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {isPending && submitIntent === "archive" ? "Архівуємо..." : "Архівувати"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {lastError ? (
              <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]">
                {lastError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {visibleTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 text-sm leading-6 text-[var(--cms-text-muted)]">
            {activeTab === "active"
              ? "Зараз немає активних завдань. Після підтвердження та запуску робіт картки з’являться тут."
              : activeTab === "draft"
                ? "Чернеток поки немає. Нове завдання з’явиться тут одразу після збереження."
                : "Архів завдань поки порожній. Перенесені картки відображатимуться тут."}
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isSelected = workspaceMode === "edit" && selectedTaskId === task.id;
            const priorityLabel =
              task.priority === "high"
                ? "Терміновий"
                : task.priority === "medium"
                  ? "Важливий"
                  : "Звичайний";

            const priorityClasses =
              task.priority === "high"
                ? "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]"
                : task.priority === "medium"
                  ? "border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
                  : "border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)]";

            const statusLabel =
              task.status === "planned"
                ? "Заплановано"
                : task.status === "in_progress"
                  ? "В роботі"
                  : task.status === "completed"
                    ? "Виконано"
                    : task.status === "archived"
                      ? "Архів"
                      : "Чернетка";

            const statusClasses =
              task.status === "planned"
                ? "border border-sky-300 bg-sky-100 text-sky-700"
                : task.status === "in_progress"
                  ? "border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
                  : task.status === "completed"
                    ? "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]"
                    : task.status === "archived"
                      ? "border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)]"
                      : "border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)]";

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => openEditMode(task)}
                className={`block w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-[var(--cms-border-strong)] bg-[var(--cms-surface)]"
                    : "border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface)]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${priorityClasses}`}>
                    {priorityLabel}
                  </span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${statusClasses}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-3 text-lg font-semibold text-[var(--cms-text)]">
                  {task.title || "Завдання без назви"}
                </div>

                <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                  {task.description || "Опис завдання поки не заповнено."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-[var(--cms-text-soft)]">
                  <span>{getDatePreview(task)}</span>
                  <span>{task.archiveYear}</span>
                  {task.contractor ? <span>{task.contractor}</span> : null}
                  <span>Фото: {task.images.length} · PDF: {task.documents.length}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title="Видалити чернетку завдання?"
        description="Чернетку буде видалено без можливості відновлення."
        confirmLabel="Видалити завдання"
        pendingLabel="Видаляємо..."
        tone="destructive"
        isPending={isPending && submitIntent === "delete"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitTask("delete");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Підтвердити публікацію завдання?"
        description="Після підтвердження завдання стане видимим на публічній сторінці будинку."
        confirmLabel="Підтвердити завдання"
        pendingLabel="Підтверджуємо..."
        tone="publish"
        isPending={isPending && submitIntent === "publish"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitTask("publish");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перенести завдання до архіву?"
        description="Після архівації завдання зникне з активного списку та публічної сторінки будинку, але залишиться доступним в архіві."
        confirmLabel="Архівувати завдання"
        pendingLabel="Архівуємо..."
        tone="warning"
        isPending={isPending && submitIntent === "archive"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitTask("archive");
        }}
      />
    </div>
  );
}
