"use client";

import { useMemo, useState } from "react";

import type { CompanyContactRequestRecord } from "@/src/modules/company/services/getCompanyContactRequests";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";

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
      <EmptyState
        title="Заявок пока нет"
        description="Новые заявки с публичного сайта компании появятся здесь."
      />
    );
  }

  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 shadow-[var(--cms-shadow-sm)]">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-[family-name:var(--font-serif)] text-[20px] font-semibold tracking-[-0.01em] text-[var(--cms-text)]">
                {activeItem.house_name}
              </div>

              <AdminStatusBadge tone={activeItem.status === "new" ? "warning" : "neutral"}>
                {activeItem.status === "new" ? "Новая" : "Просмотрена"}
              </AdminStatusBadge>
            </div>

            <div className="mt-3 text-sm text-[var(--cms-text-muted)]">
              {activeItem.address}
            </div>

            {activeItem.osbb_name ? (
              <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
                ОСББ: {activeItem.osbb_name}
              </div>
            ) : null}

            <div className="mt-3 text-sm text-[var(--cms-text-muted)]">
              Контакт: {activeItem.requester_name} · {activeItem.requester_email}
              {activeItem.requester_phone ? ` · ${activeItem.requester_phone}` : ""}
            </div>

            {activeItem.comment ? (
              <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm leading-6 text-[var(--cms-text-muted)]">
                {activeItem.comment}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2 text-sm text-[var(--cms-text-muted)]">
            {formatDateTime(activeItem.created_at)}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Предыдущая заявка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-base font-semibold text-[var(--cms-text)] transition-colors hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            ←
          </button>

          <div className="min-w-[72px] text-center text-sm font-medium text-[var(--cms-text-muted)]">
            {safeIndex + 1} из {visibleItems.length}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Следующая заявка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-base font-semibold text-[var(--cms-text)] transition-colors hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
