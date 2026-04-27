"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  addPlatformTaskComment,
  type AddPlatformTaskCommentState,
} from "@/src/modules/tasks/actions/addPlatformTaskComment";
import {
  updatePlatformTask,
  type UpdatePlatformTaskState,
} from "@/src/modules/tasks/actions/updatePlatformTask";
import { archivePlatformTask } from "@/src/modules/tasks/actions/archivePlatformTask";
import { deletePlatformTask } from "@/src/modules/tasks/actions/deletePlatformTask";
import { restorePlatformTask } from "@/src/modules/tasks/actions/restorePlatformTask";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import type { AdminTaskBoardItem } from "@/src/modules/tasks/types/tasks.types";

type AdminTaskSidePanelProps = {
  task: AdminTaskBoardItem | null;
  assignees: Array<{
    id: string;
    name: string;
  }>;
  houses: Array<{
    id: string;
    name: string;
  }>;
  onClose: () => void;
};

type TaskPanelTab = "details" | "comments" | "history";

type ConfirmAction = "archive" | "delete" | "restore" | null;


const INITIAL_COMMENT_STATE: AddPlatformTaskCommentState = {
  error: null,
  success: null,
};


const INITIAL_UPDATE_STATE: UpdatePlatformTaskState = {
  error: null,
  success: null,
};

function SaveTaskButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-2xl bg-[var(--cms-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-primary-contrast)] transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Зберігаємо..." : "Зберегти"}
    </button>
  );
}

function formatDateInputValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function CommentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-2xl bg-[var(--cms-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-primary-contrast)] transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Додаємо..." : "Додати коментар"}
    </button>
  );
}

function getStatusLabel(value: string) {
  if (value === "todo") return "Взяти в роботу";
  if (value === "in_progress") return "В процесі";
  if (value === "review") return "На перевірці";
  if (value === "done") return "Виконано";
  return value;
}

function getTypeLabel(value: string) {
  if (value === "draft_approval") return "Чернетка на погодженні";
  if (value === "resident_request") return "Заявка від мешканця";
  if (value === "specialist_request") return "Запит на спеціаліста";
  if (value === "system") return "Системна задача";
  return "Ручна задача";
}

function getPriorityLabel(value: string | null) {
  if (value === "high") return "Високий";
  if (value === "medium") return "Середній";
  if (value === "low") return "Низький";
  return "Без пріоритету";
}

function formatDateTime(value: string | null) {
  if (!value) return "Не вказано";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не вказано";

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--cms-text-secondary)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-[var(--cms-text-primary)]">
        {value}
      </div>
    </div>
  );
}

export function AdminTaskSidePanel({
  task,
  assignees,
  houses,
  onClose,
}: AdminTaskSidePanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TaskPanelTab>("details");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [commentState, commentAction] = useActionState(
    addPlatformTaskComment,
    INITIAL_COMMENT_STATE,
  );

  const [updateState, updateAction] = useActionState(
    updatePlatformTask,
    INITIAL_UPDATE_STATE,
  );

  useEffect(() => {
    if (updateState.success) {
      onClose();
    }
  }, [updateState.success, onClose]);

  useEffect(() => {
    if (!task) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, task]);

  if (!task) {
    return null;
  }

  const houseLabel =
    task.housesCount > 1
      ? "Кілька будинків"
      : task.primaryHouseLabel ?? "Без будинку";

  return (
    <div
      className="fixed inset-0 z-[110] bg-[rgba(15,23,42,0.50)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-panel-title"
      onMouseDown={onClose}
    >
      <aside
        className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] shadow-[0_24px_80px_rgba(2,6,23,0.55)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--cms-border-primary)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <AdminStatusBadge tone="info">
                  {getTypeLabel(task.taskType)}
                </AdminStatusBadge>
                <AdminStatusBadge tone="neutral">
                  {getStatusLabel(task.status)}
                </AdminStatusBadge>
                {task.isOverdue ? (
                  <AdminStatusBadge tone="danger">Прострочено</AdminStatusBadge>
                ) : null}
              </div>

              <h2
                id="task-panel-title"
                className="mt-4 text-xl font-semibold leading-7 text-[var(--cms-text-primary)]"
              >
                {task.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-tertiary)]"
              aria-label="Закрити"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex flex-wrap gap-3">
            {[
              {
                key: "details",
                label: "Деталі",
              },
              {
                key: "comments",
                label: `Коментарі (${task.comments.length})`,
              },
              {
                key: "history",
                label: `Історія (${task.events.length})`,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TaskPanelTab)}
                  className={[
                    "inline-flex items-center rounded-full px-5 py-3 text-sm font-medium transition",
                    isActive
                      ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                      : "border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-secondary)] hover:bg-[var(--cms-bg-tertiary)]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "details" ? (

            <form action={updateAction} className="flex min-h-full flex-col">
              <input type="hidden" name="taskId" value={task.id} />

              <div className="space-y-4 pb-32">
                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text-primary)]">
                    Назва задачі
                  </span>
                  <input
                    name="title"
                    defaultValue={task.title}
                    disabled={task.taskType !== "manual"}
                    className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text-primary)]">
                    Опис
                  </span>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={task.description ?? ""}
                    className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Статус</span>
                    <select
                      name="status"
                      defaultValue={task.status}
                      className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
                    >
                      <option value="todo">Взяти в роботу</option>
                      <option value="in_progress">В процесі</option>
                      <option value="review">На перевірці</option>
                      <option value="done">Виконано</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Виконавець</span>
                    <select
                      name="assignedTo"
                      defaultValue={task.assignedToId ?? ""}
                      className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
                    >
                      <option value="">Не призначено</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Пріоритет</span>
                    <select
                      name="priority"
                      defaultValue={task.priority ?? ""}
                      className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
                    >
                      <option value="">Без пріоритету</option>
                                            <option value="high">Високий</option>
                      <option value="medium">Середній</option>
                      <option value="low">Низький</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Дедлайн</span>
                    <input
                      type="date"
                      name="deadlineAt"
                      defaultValue={formatDateInputValue(task.deadlineAt)}
                      className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailRow label="Тип" value={getTypeLabel(task.taskType)} />

                  {task.taskType === "manual" ? (
                    <label className="block rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4">
                      <span className="text-xs uppercase tracking-wide text-[var(--cms-text-secondary)]">
                        Будинок
                      </span>
                      <select
                        name="houseId"
                        defaultValue={task.primaryHouseId ?? ""}
                        className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] px-4 py-3 text-sm text-[var(--cms-text-primary)]"
                      >
                        <option value="">Без будинку</option>
                        {houses.map((house) => (
                          <option key={house.id} value={house.id}>
                            {house.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <DetailRow label="Будинок" value={houseLabel} />
                  )}
                </div>

                {updateState.error ? (
                  <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
                    {updateState.error}
                  </div>
                ) : null}

              </div>

              <div className="fixed bottom-0 right-0 w-full max-w-2xl border-t border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <SaveTaskButton />

                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setConfirmAction("delete");
                      }}
                      className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)]"
                    >
                      Видалити
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setConfirmAction("archive");
                    }}
                    className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-5 py-3 text-sm font-medium"
                  >
                    Архівувати
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {activeTab === "comments" ? (
            <div className="space-y-4">
              <form action={commentAction} className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4">
                <input type="hidden" name="taskId" value={task.id} />

                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text-primary)]">
                    Новий коментар
                  </span>
                  <textarea
                    name="content"
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] px-4 py-3 text-sm text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
                    placeholder="Напишіть короткий коментар по задачі"
                  />
                </label>

                {commentState.error ? (
                  <div className="mt-3 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
                    {commentState.error}
                  </div>
                ) : null}

                {commentState.success ? (
                  <div className="mt-3 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
                    {commentState.success}
                  </div>
                ) : null}

                <div className="mt-3 flex justify-end">
                  <CommentSubmitButton />
                </div>
              </form>

              <div className="space-y-3">
              {task.comments.length ? (
                task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[var(--cms-text-primary)]">
                        {comment.authorName ?? "Система"}
                      </div>
                      <div className="text-xs text-[var(--cms-text-secondary)]">
                        {formatDateTime(comment.createdAt)}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--cms-text-secondary)]">
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4 text-sm text-[var(--cms-text-secondary)]">
                  Коментарів поки немає.
                </div>
              )}
              </div>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--cms-border-primary)]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-[var(--cms-bg-secondary)] text-xs uppercase tracking-wide text-[var(--cms-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3">Дія</th>
                    <th className="px-4 py-3">Автор</th>
                    <th className="px-4 py-3">Було</th>
                    <th className="px-4 py-3">Стало</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cms-border-primary)]">
                  {task.events.length ? (
                    task.events.map((event) => (
                      <tr key={event.id} className="bg-[var(--cms-bg-primary)]">
                        <td className="px-4 py-3 text-[var(--cms-text-secondary)]">
                          {formatDateTime(event.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--cms-text-primary)]">
                          {event.actionLabel}
                        </td>
                        <td className="px-4 py-3 text-[var(--cms-text-secondary)]">
                          {event.actorName ?? "Система"}
                        </td>
                        <td className="px-4 py-3 text-[var(--cms-text-secondary)]">
                          {event.beforeValue ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--cms-text-primary)]">
                          {event.afterValue ?? "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-[var(--cms-text-secondary)]"
                      >
                        Історії поки немає.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </aside>

      <PlatformConfirmModal
      open={confirmAction !== null}
      title={
        confirmAction === "archive"
          ? "Архівувати задачу?"
          : confirmAction === "delete"
            ? "Видалити задачу?"
            : "Відновити задачу?"
      }
      description={
        actionError ??
        (confirmAction === "delete"
          ? "Дія незворотна. Історія при цьому зберігається."
          : confirmAction === "archive"
            ? "Задача буде переміщена до архіву."
            : "Задача повернеться до активних.")
      }
      confirmLabel={
        confirmAction === "delete"
          ? "Видалити"
          : confirmAction === "archive"
            ? "Архівувати"
            : "Відновити"
      }
      tone={confirmAction === "delete" ? "destructive" : "warning"}
      isPending={isActionPending}
      pendingLabel="Виконуємо..."
      onCancel={() => {
        if (!isActionPending) {
          setConfirmAction(null);
          setActionError(null);
        }
      }}
      onConfirm={async () => {
        setIsActionPending(true);
        setActionError(null);

        let result = { error: null as string | null };

        if (confirmAction === "archive") {
          result = await archivePlatformTask(task.id);
        }

        if (confirmAction === "delete") {
          result = await deletePlatformTask(task.id);
        }

        if (confirmAction === "restore") {
          result = await restorePlatformTask(task.id);
        }

        setIsActionPending(false);

        if (result.error) {
          setActionError(result.error);
          return;
        }

        setConfirmAction(null);
        onClose();
        router.refresh();
      }}
    />
    </div>
  );
}
