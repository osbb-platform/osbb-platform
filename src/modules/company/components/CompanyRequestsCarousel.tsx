"use client";

import { useMemo, useState } from "react";
import type { CompanyContactRequestRecord } from "@/src/modules/company/services/getCompanyContactRequests";

type Props = {
  requests: CompanyContactRequestRecord[];
};

const MAX_ITEMS = 20;

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не вказана";
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CompanyRequestsCarousel({ requests }: Props) {
  const visibleItems = useMemo(() => requests.slice(0, MAX_ITEMS), [requests]);
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex =
    visibleItems.length === 0
      ? 0
      : Math.min(activeIndex, visibleItems.length - 1);

  const activeItem = visibleItems[safeIndex] ?? null;
  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < visibleItems.length - 1;

  function handlePrev() {
    if (!canGoPrev) return;
    setActiveIndex((current) => Math.max(0, current - 1));
  }

  function handleNext() {
    if (!canGoNext) return;
    setActiveIndex((current) => Math.min(visibleItems.length - 1, current + 1));
  }

  if (!activeItem) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-6 text-[var(--cms-text-secondary)]">
        Заявок пока нет.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-[var(--cms-text-primary)] sm:text-xl">
                {activeItem.house_name}
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  activeItem.status === "new"
                    ? "border border-orange-300 bg-orange-50 text-orange-700"
                    : "border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text-secondary)]"
                }`}
              >
                {activeItem.status === "new" ? "Новая" : "Просмотрена"}
              </span>
            </div>

            <div className="mt-3 text-sm text-[var(--cms-text-secondary)]">
              {activeItem.address}
            </div>

            {activeItem.osbb_name ? (
              <div className="mt-2 text-sm text-[var(--cms-text-secondary)]">
                ОСББ: {activeItem.osbb_name}
              </div>
            ) : null}

            <div className="mt-3 text-sm text-[var(--cms-text-secondary)]">
              Контакт: {activeItem.requester_name} · {activeItem.requester_email}
              {activeItem.requester_phone ? ` · ${activeItem.requester_phone}` : ""}
            </div>

            {activeItem.comment ? (
              <div className="mt-4 rounded-2xl border border-[var(--cms-border-primary)] px-4 py-3 text-sm leading-6 text-[var(--cms-text-secondary)]">
                {activeItem.comment}
              </div>
            ) : null}
          </div>

          <div className="min-w-[180px] text-sm text-[var(--cms-text-muted)]">
            {formatDateTime(activeItem.created_at)}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Предыдущая заявка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-base font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-[var(--cms-border-primary)] disabled:bg-[var(--cms-bg-secondary)] disabled:text-[var(--cms-text-muted)]"
          >
            ←
          </button>

          <div className="min-w-[72px] text-center text-sm text-amber-700">
            {safeIndex + 1} из {visibleItems.length}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Следующая заявка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-base font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-[var(--cms-border-primary)] disabled:bg-[var(--cms-bg-secondary)] disabled:text-[var(--cms-text-muted)]"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
