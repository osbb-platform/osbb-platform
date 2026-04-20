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
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-slate-400">
        Заявок пока нет.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-white sm:text-xl">
                {activeItem.house_name}
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  activeItem.status === "new"
                    ? "bg-orange-900/40 text-orange-300"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {activeItem.status === "new" ? "Новая" : "Просмотрена"}
              </span>
            </div>

            <div className="mt-3 text-sm text-slate-300">
              {activeItem.address}
            </div>

            {activeItem.osbb_name ? (
              <div className="mt-2 text-sm text-slate-400">
                ОСББ: {activeItem.osbb_name}
              </div>
            ) : null}

            <div className="mt-3 text-sm text-slate-300">
              Контакт: {activeItem.requester_name} · {activeItem.requester_email}
              {activeItem.requester_phone ? ` · ${activeItem.requester_phone}` : ""}
            </div>

            {activeItem.comment ? (
              <div className="mt-4 rounded-2xl border border-slate-800 px-4 py-3 text-sm leading-6 text-slate-300">
                {activeItem.comment}
              </div>
            ) : null}
          </div>

          <div className="min-w-[180px] text-sm text-slate-500">
            {formatDateTime(activeItem.created_at)}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Предыдущая заявка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-base font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
          >
            ←
          </button>

          <div className="min-w-[72px] text-center text-sm text-amber-100">
            {safeIndex + 1} из {visibleItems.length}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Следующая заявка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-base font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
