"use client";

import { useState } from "react";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";
import type { PubTone } from "@/src/shared/ui/public/pubStyles";
import { pubToneClass } from "@/src/shared/ui/public/pubStyles";

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

function getPriorityTone(priority: PlanTaskPriority): PubTone {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "neutral";
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

const META_BLOCK =
  "rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4";
const META_LABEL =
  "text-[11px] font-medium uppercase tracking-wide text-[var(--pub-text-soft)]";
const META_VALUE = "mt-2 text-sm font-medium text-[var(--pub-text)]";

type PublicPlanTaskViewerProps = {
  task: PlanTask;
  houseId?: string;
  houseSlug?: string;
};

export function PublicPlanTaskViewer({
  task,
  houseId,
  houseSlug,
}: PublicPlanTaskViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const priorityChip = `inline-flex rounded-[var(--r-pill)] border px-3 py-1 text-xs font-medium ${pubToneClass[getPriorityTone(task.priority)]}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block w-full rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 text-left shadow-[var(--pub-shadow-sm)] transition hover:bg-[var(--pub-bg-quiet)] hover:shadow-[var(--pub-shadow-md)]"
      >
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold tracking-tight text-[var(--pub-text)]">
              {task.title}
            </div>
          </div>

          <span className={priorityChip}>{getPriorityLabel(task.priority)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-3 py-1 text-xs font-medium text-[var(--pub-text-muted)]">
            {getDateSticker(task)}
          </span>

          <span className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--pub-text-muted)]">
            Відкрити деталі
            <PubIcon name="chevron-right" className="h-3.5 w-3.5" />
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="pub-theme-root fixed inset-0 z-50 flex items-center justify-center bg-[var(--pub-overlay)] p-4 backdrop-blur-[2px]">
          <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)]">
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--pub-border)] bg-[var(--pub-surface)] px-5 py-4">
              <div className="font-[var(--font-serif)] text-lg font-semibold tracking-tight text-[var(--pub-text)]">
                {task.title}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-pill)] border border-[var(--pub-border)] text-[var(--pub-text-muted)] transition hover:bg-[var(--pub-bg-quiet)]"
                aria-label="Закрити задачу"
              >
                <PubIcon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-3 py-1 text-xs font-medium text-[var(--pub-text-muted)]">
                  {getDateSticker(task)}
                </span>
                <span className={priorityChip}>{getPriorityLabel(task.priority)}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={META_BLOCK}>
                  <div className={META_LABEL}>Статус</div>
                  <div className={META_VALUE}>{getStatusLabel(task.status)}</div>
                </div>

                <div className={META_BLOCK}>
                  <div className={META_LABEL}>Підрядник</div>
                  <div className={META_VALUE}>{task.contractor || "Не вказано"}</div>
                </div>

                <div className={META_BLOCK}>
                  <div className={META_LABEL}>Створено</div>
                  <div className={META_VALUE}>{formatDateTime(task.createdAt)}</div>
                </div>

                <div className={META_BLOCK}>
                  <div className={META_LABEL}>Оновлено</div>
                  <div className={META_VALUE}>{formatDateTime(task.updatedAt)}</div>
                </div>
              </div>

              <div>
                <div className={META_LABEL}>Опис</div>
                <div className="mt-2 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4 text-sm leading-7 text-[var(--pub-text-muted)]">
                  {task.description || "Опис не додано."}
                </div>
              </div>

              {task.images.length > 0 ? (
                <div>
                  <div className={META_LABEL}>Фото</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {task.images.map((image, index) => {
                      const href =
                        image.path && image.id && houseSlug
                          ? `/api/reports/view?${new URLSearchParams({
                              entityType: "house_plan_task",
                              entityId: task.id,
                              fieldKey: image.id,
                              houseSlug,
                            }).toString()}`
                          : "";
                      return href ? (
                        <a
                          key={image.id || `${task.id}-image-${index}`}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-4 py-3 text-sm font-medium text-[var(--pub-text)] transition hover:bg-[var(--pub-surface-elevated)]"
                        >
                          <PubIcon name="doc" className="h-4 w-4" />
                          Відкрити фото {index + 1}
                        </a>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : null}

              {task.documents.length > 0 ? (
                <div>
                  <div className={META_LABEL}>Документи</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {task.documents.map((document, index) => {
                      const fileFieldKey = document.id || "";
                      return document.path && fileFieldKey && houseSlug ? (
                        <div key={document.id || `${task.id}-document-${index}`}>
                          <PublicReportPdfViewer
                            entityType="house_plan_task"
                            entityId={task.id}
                            fieldKey={fileFieldKey}
                            houseSlug={houseSlug}
                            fileName={`Документ ${index + 1}`}
                            analyticsHouseId={houseId}
                            analyticsHouseSlug={houseSlug}
                            analyticsEntityId={task.id}
                            analyticsDocumentType="plan_document"
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
