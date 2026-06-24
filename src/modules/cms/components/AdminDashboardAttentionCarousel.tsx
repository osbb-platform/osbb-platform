"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { AdminDashboardLinkItem } from "@/src/modules/houses/services/getAdminDashboardV1";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";

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

  return date.toLocaleString("uk-UA", {
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
      <EmptyState
        title="Немає матеріалів на перевірку"
        description="Зараз немає матеріалів, що очікують підтвердження."
      />
    );
  }

  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 shadow-[var(--cms-shadow-sm)]">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone="warning">Потребує уваги</AdminStatusBadge>
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--cms-text-soft)]">
                {activeItem.houseName}
              </span>
              <span className="text-[var(--cms-text-soft)]">•</span>
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--cms-text-soft)]">
                {getSectionLabel(activeItem.section)}
              </span>
            </div>

            <div className="mt-3 font-[family-name:var(--font-serif)] text-[20px] font-semibold tracking-[-0.01em] text-[var(--cms-text)]">
              {activeItem.title}
            </div>

            <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
              Оновлено: {formatDateTime(activeItem.updatedAt)}
            </div>
          </div>

          <Link
            href={activeItem.href}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] px-4 text-sm font-semibold text-[var(--cms-warning-text)] transition-[filter,transform] hover:brightness-[1.04] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-base font-semibold text-[var(--cms-text)] transition-colors hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            ←
          </button>

          <div className="min-w-[72px] text-center text-sm font-medium text-[var(--cms-text-muted)]">
            {safeIndex + 1} із {visibleItems.length}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Наступний матеріал"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] text-base font-semibold text-[var(--cms-text)] transition-colors hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
