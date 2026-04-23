"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminDashboardLinkItem } from "@/src/modules/houses/services/getAdminDashboardV1";

type Props = {
  items: AdminDashboardLinkItem[];
};

const MAX_ITEMS = 10;

function formatDateTime(value: string | null) {
  if (!value) {
    return "Дата не вказана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не вказана";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSectionLabel(section: string) {
  const normalized = section.trim().toLowerCase();

  if (normalized === "announcements") return "Оголошення";
  if (normalized === "contacts") return "Правління";
  if (normalized === "specialists") return "Спеціалісти";
  if (normalized === "faq") return "FAQ";
  if (normalized === "rich_text" || normalized === "information") {
    return "Інформація";
  }
  if (normalized === "meetings") return "Збори";
  if (normalized === "reports") return "Звіти";
  if (normalized === "plan") return "План робіт";
  if (normalized === "debtors") return "Боржники";
  if (normalized === "requisites") return "Реквізити";
  if (normalized === "board") return "Правління";
  if (normalized === "home") return "Головна";
  return section;
}

export function AdminDashboardAttentionCarousel({ items }: Props) {
  const visibleItems = useMemo(() => items.slice(0, MAX_ITEMS), [items]);
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
    setActiveIndex((current) =>
      Math.min(visibleItems.length - 1, current + 1),
    );
  }

  if (!activeItem) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
        Зараз немає матеріалів, що очікують підтвердження.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-200">
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1">
                Потребує уваги
              </span>
              <span>{activeItem.houseName}</span>
              <span className="text-amber-300/70">•</span>
              <span>{getSectionLabel(activeItem.section)}</span>
            </div>

            <div className="mt-3 text-lg font-semibold text-white sm:text-xl">
              {activeItem.title}
            </div>

            <div className="mt-2 text-sm text-slate-300">
              Оновлено: {formatDateTime(activeItem.updatedAt)}
            </div>
          </div>

          <Link
            href={activeItem.href}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
          >
            Перейти до розділу
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Попередній матеріал"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-base font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
          >
            ←
          </button>

          <div className="min-w-[72px] text-center text-sm text-amber-100">
            {safeIndex + 1} із {visibleItems.length}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Наступний матеріал"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-base font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
