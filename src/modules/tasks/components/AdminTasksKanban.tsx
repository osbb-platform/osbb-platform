"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { CSS } from "@dnd-kit/utilities";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import { updatePlatformTaskStatus } from "@/src/modules/tasks/actions/updatePlatformTaskStatus";
import { AdminTaskSidePanel } from "@/src/modules/tasks/components/AdminTaskSidePanel";
import { CreateTaskModal } from "@/src/modules/tasks/components/CreateTaskModal";
import type {
  AdminTaskBoardItem,
  PlatformTaskStatus,
} from "@/src/modules/tasks/types/tasks.types";

type AdminTasksKanbanProps = {
  initialTasks: AdminTaskBoardItem[];
  assignees: Array<{
    id: string;
    name: string;
  }>;
  houses: Array<{
    id: string;
    name: string;
  }>;
};

const TASK_COLUMNS: Array<{
  key: PlatformTaskStatus;
  label: string;
  tone: "neutral" | "info" | "warning" | "success";
}> = [
  { key: "todo", label: "Взяти в роботу", tone: "neutral" },
  { key: "in_progress", label: "В процесі", tone: "info" },
  { key: "review", label: "На перевірці", tone: "warning" },
  { key: "done", label: "Виконано", tone: "success" },
];

function getTypeLabel(value: string) {
  if (value === "draft_approval") return "Чернетка";
  if (value === "resident_request") return "Звернення";
  if (value === "specialist_request") return "Запит";
  if (value === "system") return "Службова";
  return "Ручна";
}

function getPriorityLabel(value: string | null) {
  if (value === "high") return "Високий";
  if (value === "medium") return "Середній";
  if (value === "low") return "Низький";
  return "Без пріоритету";
}

function matchesFilters(
  task: AdminTaskBoardItem,
  taskTypeFilter: "all" | "manual" | "auto",
  assigneeFilter: string,
  priorityFilter: string,
) {
  const isAutomaticTask = task.taskType !== "manual";

  if (
    taskTypeFilter === "manual" &&
    isAutomaticTask
  ) {
    return false;
  }

  if (
    taskTypeFilter === "auto" &&
    !isAutomaticTask
  ) {
    return false;
  }

  if (
    assigneeFilter !== "all" &&
    task.assignedToId !== assigneeFilter
  ) {
    return false;
  }

  if (
    priorityFilter !== "all" &&
    task.priority !== priorityFilter
  ) {
    return false;
  }

  return true;
}

function getPriorityCardClass(priority: string | null) {
  if (priority === "high") {
    return "border-[rgba(220,38,38,0.28)] bg-[rgba(254,242,242,0.96)]";
  }

  if (priority === "medium") {
    return "border-[rgba(249,115,22,0.28)] bg-[rgba(255,247,237,0.96)]";
  }

  return "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)]";
}

function formatDate(value: string | null) {
  if (!value) return "Без дедлайну";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Без дедлайну";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function TaskColumn({
  id,
  label,
  tone,
  tasks,
  onOpenTask,
}: {
  id: PlatformTaskStatus;
  label: string;
  tone: "neutral" | "info" | "warning" | "success";
  tasks: AdminTaskBoardItem[];
  onOpenTask: (task: AdminTaskBoardItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={[
        "min-h-[560px] rounded-3xl border p-4 transition",
        isOver
          ? "border-[var(--cms-tab-active-border)] bg-[var(--cms-tab-active-bg)]"
          : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)]",
      ].join(" ")}
    >
      <div className="mb-4 rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--cms-text-primary)]">
            {label}
          </h2>

          <AdminStatusBadge tone={tone}>{tasks.length}</AdminStatusBadge>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpenTask={onOpenTask} />
        ))}

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4 text-sm leading-6 text-[var(--cms-text-secondary)]">
            У цій колонці поки немає задач.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  onOpenTask,
}: {
  task: AdminTaskBoardItem;
  onOpenTask: (task: AdminTaskBoardItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        status: task.status,
      },
    });

  const houseLabel =
    task.housesCount > 1
      ? "Кілька будинків"
      : task.primaryHouseLabel ?? "Без будинку";

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenTask(task)}
      className={[
        "flex h-[260px] cursor-pointer flex-col rounded-3xl border p-4 shadow-sm transition",
        getPriorityCardClass(task.priority),
        isDragging ? "opacity-60" : "hover:border-[var(--cms-border-secondary)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <AdminStatusBadge tone="info">{getTypeLabel(task.taskType)}</AdminStatusBadge>

        <button
          type="button"
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-8 min-w-8 cursor-grab items-center justify-center rounded-xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] px-2 text-xs font-semibold text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-tertiary)] active:cursor-grabbing"
          aria-label="Перетягнути задачу"
          title="Перетягнути"
        >
          ⋮⋮
        </button>

        {task.isOverdue ? (
          <AdminStatusBadge tone="danger">Прострочено</AdminStatusBadge>
        ) : null}
      </div>

      <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-[var(--cms-text-primary)]">
        {task.title}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--cms-text-secondary)]">
        {task.description || "Опис не додано"}
      </p>

      <div className="mt-auto space-y-2 pt-3 text-xs text-[var(--cms-text-secondary)]">
        <div className="flex items-center justify-between gap-3">
          <span>Будинок</span>
          <span className="max-w-32 truncate text-[var(--cms-text-primary)]">
            {houseLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span>Виконавець</span>
          <span className="max-w-32 truncate text-[var(--cms-text-primary)]">
            {task.assignedToName ?? "Не призначено"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span>Пріоритет</span>
          <span className="text-[var(--cms-text-primary)]">
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span>Дедлайн</span>
          <span className="text-[var(--cms-text-primary)]">
            {formatDate(task.deadlineAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function AdminTasksKanban({
  initialTasks,
  assignees,
  houses,
}: AdminTasksKanbanProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"board" | "archive">("board");
  const [taskTypeFilter, setTaskTypeFilter] = useState<"all" | "manual" | "auto">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const visibleTasks = tasks.filter(
    (task) =>
      !task.archivedAt &&
      matchesFilters(
        task,
        taskTypeFilter,
        assigneeFilter,
        priorityFilter,
      ),
  );

  const archivedTasks = tasks.filter(
    (task) =>
      Boolean(task.archivedAt) &&
      matchesFilters(
        task,
        taskTypeFilter,
        assigneeFilter,
        priorityFilter,
      ),
  );

  const grouped = useMemo(() => {
    return TASK_COLUMNS.reduce(
      (acc, column) => {
        acc[column.key] = visibleTasks.filter(
          (task) => task.status === column.key,
        );
        return acc;
      },
      {} as Record<PlatformTaskStatus, AdminTaskBoardItem[]>,
    );
  }, [visibleTasks]);

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? null;

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;

    if (!overId) return;

    const nextStatus = String(overId) as PlatformTaskStatus;

    if (!TASK_COLUMNS.some((column) => column.key === nextStatus)) {
      return;
    }

    const taskId = String(event.active.id);
    const previousTasks = tasks;

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ),
    );

    startTransition(async () => {
      const result = await updatePlatformTaskStatus({
        taskId,
        nextStatus,
      });

      if (result.error) {
        setTasks(previousTasks);
        window.alert(result.error);
      }
    });
  }

  const activeIncompleteCount = tasks.filter(
    (task) => !task.archivedAt && task.status !== "done",
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
              Задачі
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-[var(--cms-text-primary)]">
              Управління задачами
            </h1>

            <p className="mt-6 text-sm leading-6 text-[var(--cms-text-secondary)]">
              Активних задач, що потребують уваги: {activeIncompleteCount}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <CreateTaskModal assignees={assignees} houses={houses} />

            <button
              type="button"
              onClick={() => setView((current) => current === "board" ? "archive" : "board")}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-5 py-3 text-sm font-medium text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-tertiary)]"
            >
              {view === "board" ? "Архів" : "Назад до задач"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cms-text-primary)]">
            {view === "board" ? "Фільтри задач" : "Архів задач"}
          </h2>
          <p className="mt-1 text-sm text-[var(--cms-text-secondary)]">
            {view === "board"
              ? "Відфільтруйте задачі за типом, виконавцем або пріоритетом."
              : "Архівні задачі показані окремим списком без перетягування."}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={taskTypeFilter}
            onChange={(event) => setTaskTypeFilter(event.target.value as "all" | "manual" | "auto")}
            className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
          >
            <option value="all">Усі задачі</option>
            <option value="manual">Ручні</option>
            <option value="auto">Автоматичні</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
          >
            <option value="all">Усі виконавці</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm"
          >
            <option value="all">Усі пріоритети</option>
                        <option value="high">Високий</option>
            <option value="medium">Середній</option>
            <option value="low">Низький</option>
          </select>
        </div>

      </div>

      {view === "board" ? (
        isMounted ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid gap-4 xl:grid-cols-4">
            {TASK_COLUMNS.map((column) => (
              <TaskColumn
                key={column.key}
                id={column.key}
                label={column.label}
                tone={column.tone}
                tasks={grouped[column.key]}
                onOpenTask={(task) => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        </DndContext>
        ) : null
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cms-bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">Задача</th>
                <th className="px-4 py-3 text-left">Тип</th>
                <th className="px-4 py-3 text-left">Пріоритет</th>
                <th className="px-4 py-3 text-left">Будинок</th>
                <th className="px-4 py-3 text-left">Виконавець</th>
                <th className="px-4 py-3 text-left">Архівовано</th>
              </tr>
            </thead>
            <tbody>
              {archivedTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="cursor-pointer border-t border-[var(--cms-border-primary)] hover:bg-[var(--cms-bg-secondary)]"
                >
                  <td className="px-4 py-3">{task.title}</td>
                  <td className="px-4 py-3">{getTypeLabel(task.taskType)}</td>
                  <td className="px-4 py-3">{getPriorityLabel(task.priority)}</td>
                  <td className="px-4 py-3">{task.primaryHouseLabel ?? "—"}</td>
                  <td className="px-4 py-3">{task.assignedToName ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(task.archivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminTaskSidePanel
        task={selectedTask}
        assignees={assignees}
        houses={houses}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
