"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { HouseSectionCounters } from "@/src/modules/houses/services/getHouseSectionCounters";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type HouseStatusLineProps = {
  houseId: string;
  counters: HouseSectionCounters;
};

const sectionLabels: Partial<Record<keyof HouseSectionCounters, string>> = {
  announcements: "Оголошення",
  information: "Інформація",
  reports: "Звіти",
  debtors: "Боржники",
  plan: "План робіт",
  meetings: "Збори",
  specialists: "Спеціалісти",
};

export function HouseStatusLine({
  houseId,
  counters,
}: HouseStatusLineProps) {
  const [draftsOpen, setDraftsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const draftSections = useMemo(
    () =>
      Object.entries(counters)
        .map(([key, value]) => ({
          key: key as keyof HouseSectionCounters,
          count: value?.warning ?? 0,
        }))
        .filter((item) => item.count > 0 && sectionLabels[item.key]),
    [counters],
  );

  const totalDrafts = draftSections.reduce(
    (total, item) => total + item.count,
    0,
  );
  const newRequests = counters.specialists?.info ?? 0;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDraftsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDraftsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (totalDrafts <= 0 && newRequests <= 0) return null;

  const houseHref = `${ROUTES.admin.houses}/${houseId}`;

  return (
    <div
      ref={rootRef}
      className="relative mt-3 flex flex-wrap items-center gap-2 text-sm"
      aria-label="Стан будинку"
    >
      {totalDrafts > 0 ? (
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-[var(--r-pill)] border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] px-3 font-medium text-[var(--cms-warning-text)] transition hover:brightness-95"
            aria-haspopup="menu"
            aria-expanded={draftsOpen}
            onClick={() => setDraftsOpen((current) => !current)}
          >
            <span
              className="h-2 w-2 rounded-full bg-[var(--cms-warning-text)]"
              aria-hidden="true"
            />
            <span>Чернетки</span>
            <span className="font-semibold">{totalDrafts}</span>
          </button>

          {draftsOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-2 min-w-64 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-2 shadow-[var(--cms-shadow-lg)]"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
                Розділи з чернетками
              </p>

              <div className="space-y-1">
                {draftSections.map((item) => (
                  <Link
                    key={item.key}
                    role="menuitem"
                    href={`${houseHref}?block=${encodeURIComponent(item.key)}`}
                    className="flex items-center justify-between gap-4 rounded-[var(--r-md)] px-3 py-2 text-sm text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)]"
                    onClick={() => setDraftsOpen(false)}
                  >
                    <span>{sectionLabels[item.key]}</span>
                    <span className="inline-flex min-w-6 items-center justify-center rounded-[var(--r-pill)] bg-[var(--cms-warning-bg)] px-1.5 text-xs font-semibold text-[var(--cms-warning-text)]">
                      {item.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {newRequests > 0 ? (
        <Link
          href={`${houseHref}?block=specialists`}
          className="inline-flex h-8 items-center gap-2 rounded-[var(--r-pill)] border border-[var(--cms-info-border)] bg-[var(--cms-info-bg)] px-3 font-medium text-[var(--cms-info-text)] transition hover:brightness-95"
        >
          <span
            className="h-2 w-2 rounded-full bg-[var(--cms-info-text)]"
            aria-hidden="true"
          />
          <span>Нові звернення</span>
          <span className="font-semibold">{newRequests}</span>
        </Link>
      ) : null}
    </div>
  );
}
