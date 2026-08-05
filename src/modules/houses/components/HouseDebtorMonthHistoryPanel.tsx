"use client";

import type { AdminHouseDebtorsSnapshot } from "@/src/modules/houses/services/getAdminHouseDebtors";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type MonthSnapshot = AdminHouseDebtorsSnapshot["monthSnapshots"][number];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  snapshots: MonthSnapshot[];
  currentDraftId: string | null;
  currentPublishedId: string | null;
  onOpenDraft: () => void;
  onOpenPublished: () => void;
};

const MONTHS = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

function formatPeriod(snapshot: MonthSnapshot) {
  return `${MONTHS[snapshot.periodMonth - 1] ?? snapshot.periodMonth} ${
    snapshot.periodYear
  }`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusView(snapshot: MonthSnapshot) {
  if (snapshot.status === "published") {
    return { label: "Опубліковано", tone: "success" as const };
  }

  if (snapshot.status === "draft") {
    return { label: "Чернетка", tone: "warning" as const };
  }

  if (snapshot.status === "superseded") {
    return { label: "Замінено", tone: "neutral" as const };
  }

  return { label: "Відхилено", tone: "danger" as const };
}

function sourceLabel(snapshot: MonthSnapshot) {
  if (snapshot.source === "buffer_1c") return "Імпорт з 1С";
  if (snapshot.source === "manual_import") return "Ручний імпорт";
  if (snapshot.source === "manual_edit") return "Ручне редагування";
  return "Перенесені дані";
}

function readOriginalFileName(snapshot: MonthSnapshot) {
  const value = snapshot.importMeta.originalFileName;
  const fileName = String(value ?? "").trim();

  return fileName || null;
}

export function HouseDebtorMonthHistoryPanel({
  isOpen,
  onClose,
  snapshots,
  currentDraftId,
  currentPublishedId,
  onOpenDraft,
  onOpenPublished,
}: Props) {
  return (
    <AdminSidePanel
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title="Історія версій боржників"
      description="Усі місячні чернетки, публікації та замінені ревізії. Основна сторінка показує лише актуальну робочу версію."
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={adminSecondaryButtonClass}
          >
            Закрити
          </button>
        </div>
      }
    >
      {snapshots.length === 0 ? (
        <div className="rounded-[var(--r-xl)] border border-dashed border-[var(--cms-border)] p-6 text-sm text-[var(--cms-text-muted)]">
          Історія місячних версій поки порожня.
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snapshot) => {
            const status = statusView(snapshot);
            const originalFileName = readOriginalFileName(snapshot);
            const isCurrentDraft = snapshot.id === currentDraftId;
            const isCurrentPublished = snapshot.id === currentPublishedId;

            return (
              <article
                key={snapshot.id}
                className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-[var(--cms-text)]">
                      {formatPeriod(snapshot)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
                      Ревізія {snapshot.revision} · Рядків: {snapshot.rowsCount}
                    </div>
                  </div>

                  <AdminStatusBadge tone={status.tone}>
                    {status.label}
                  </AdminStatusBadge>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--cms-text-muted)]">
                      Джерело
                    </dt>
                    <dd className="mt-1 text-[var(--cms-text)]">
                      {sourceLabel(snapshot)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-[var(--cms-text-muted)]">
                      Оновлено
                    </dt>
                    <dd className="mt-1 text-[var(--cms-text)]">
                      {formatDate(snapshot.updatedAt)}
                    </dd>
                  </div>

                  {originalFileName ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-[var(--cms-text-muted)]">
                        Файл
                      </dt>
                      <dd className="mt-1 break-all text-[var(--cms-text)]">
                        {originalFileName}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {isCurrentDraft || isCurrentPublished ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={isCurrentDraft ? onOpenDraft : onOpenPublished}
                      className={adminPrimaryButtonClass}
                    >
                      {isCurrentDraft
                        ? "Відкрити актуальну чернетку"
                        : "Відкрити актуальну публікацію"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </AdminSidePanel>
  );
}
