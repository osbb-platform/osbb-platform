"use client";

import { useState } from "react";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";

type PlanTaskStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "archived";

type PlanTaskPriority = "high" | "medium" | "low";
type PlanTaskDateMode = "deadline" | "range";

type PlanTaskImage = {
  id: string;
  path: string;
  url?: string;
  kind: "image";
  createdAt: string;
};

type PlanTaskDocument = {
  id: string;
  path: string;
  url?: string;
  kind: "pdf";
  createdAt: string;
};

type PlanTask = {
  id: string;
  title: string;
  description: string;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  dateMode: PlanTaskDateMode;
  deadlineAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  contractor?: string | null;
  images: PlanTaskImage[];
  documents: PlanTaskDocument[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Дата не вказана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не вказана";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Дата не вказана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не вказана";

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: PlanTaskStatus) {
  if (status === "planned") return "Заплановано";
  if (status === "in_progress") return "В роботі";
  if (status === "completed") return "Виконано";
  if (status === "archived") return "Архів";
  return "Чернетка";
}

function getPriorityLabel(priority: PlanTaskPriority) {
  if (priority === "high") return "Терміновий";
  if (priority === "medium") return "Важливий";
  return "Звичайний";
}

function getPriorityClasses(priority: PlanTaskPriority) {
  if (priority === "high") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getDateSticker(task: PlanTask) {
  if (task.dateMode === "range") {
    if (task.startDate && task.endDate) {
      return `${formatDate(task.startDate)} — ${formatDate(task.endDate)}`;
    }
    if (task.startDate) return `Від ${formatDate(task.startDate)}`;
    if (task.endDate) return `До ${formatDate(task.endDate)}`;
    return "Період не вказано";
  }

  return task.deadlineAt
    ? `Кінцевий термін: ${formatDate(task.deadlineAt)}`
    : "Кінцевий термін не вказано";
}

export function PublicPlanTaskViewer({ task }: { task: PlanTask }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:bg-slate-50"
      >
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold tracking-tight text-slate-900">
              {task.title}
            </div>
          </div>

          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClasses(
              task.priority,
            )}`}
          >
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            {getDateSticker(task)}
          </span>

          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            Відкрити деталі
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="text-lg font-semibold tracking-tight text-slate-900">
                {task.title}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Закрити задачу"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {getDateSticker(task)}
                </span>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClasses(
                    task.priority,
                  )}`}
                >
                  {getPriorityLabel(task.priority)}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Статус
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {getStatusLabel(task.status)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Підрядник
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {task.contractor || "Не вказано"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Створено
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {formatDateTime(task.createdAt)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Оновлено
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {formatDateTime(task.updatedAt)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Опис
                </div>
                <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {task.description || "Опис не додано."}
                </div>
              </div>

              {task.images.length > 0 ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Фото
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {task.images.map((image, index) => {
                      const href = image.path
                        ? `/api/reports/view?path=${encodeURIComponent(image.path)}&bucket=house-plan-media`
                        : "";
                      return href ? (
                        <a
                          key={image.id || `${task.id}-image-${index}`}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
                        >
                          Відкрити фото {index + 1}
                        </a>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : null}

              {task.documents.length > 0 ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Документи
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {task.documents.map((document, index) => {
                      const filePath = document.path || "";
                      return filePath ? (
                        <div key={document.id || `${task.id}-document-${index}`}>
                          <PublicReportPdfViewer
                            filePath={filePath}
                            fileName={`Документ ${index + 1}`}
                            bucket="house-plan-documents"
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
