"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";
import { useState } from "react";
import type { PublicHouseBellItem } from "@/src/modules/houses/services/getPublicHouseBellFeed";
import { PubIcon, type PubIconName } from "@/src/shared/ui/public/PublicIcons";

type PublicHouseBellPopupProps = {
  items: PublicHouseBellItem[];
};

function sectionLook(section: string): { icon: PubIconName; bg: string; fg: string } {
  const s = section.toLowerCase();

  if (s.includes("оголош")) {
    return {
      icon: "megaphone",
      bg: "bg-[var(--pub-warning-bg)]",
      fg: "text-[var(--pub-warning-text)]",
    };
  }

  if (s.includes("збор") || s.includes("засідан")) {
    return {
      icon: "calendar",
      bg: "bg-[var(--pub-info-bg)]",
      fg: "text-[var(--pub-info-text)]",
    };
  }

  if (s.includes("документ") || s.includes("звіт")) {
    return {
      icon: "doc",
      bg: "bg-[var(--pub-success-bg)]",
      fg: "text-[var(--pub-success-text)]",
    };
  }

  return {
    icon: "info",
    bg: "bg-[var(--pub-accent-soft)]",
    fg: "text-[var(--pub-accent-strong)]",
  };
}

function groupItems(items: PublicHouseBellItem[]) {
  const groups = new Map<string, PublicHouseBellItem[]>();

  for (const item of items) {
    const key = item.section.trim() || "Оновлення";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries());
}

export function PublicHouseBellPopup({ items }: PublicHouseBellPopupProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 3);
  const groups = groupItems(visibleItems);
  const countLabel = items.length > 9 ? "9+" : String(items.length);

  return (
    <div className="fixed left-1/2 top-20 z-[70] w-[calc(100vw-2rem)] max-w-[23rem] -translate-x-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[390px] sm:max-w-none sm:translate-x-0">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--pub-border)] px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
            {houseCopy.bell.title}
          </div>
          <div className="mt-1 text-[17px] font-semibold leading-tight text-[var(--pub-text)]">
            {houseCopy.bell.period}
          </div>
        </div>

        {items.length > 0 ? (
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-2 text-sm font-bold text-[var(--pub-accent-contrast)]">
            {countLabel}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)]">
            <PubIcon name="bell" className="h-6 w-6" />
          </span>
          <div className="mt-3 text-sm leading-6 text-[var(--pub-text-muted)]">
            {houseCopy.bell.empty}
          </div>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto overscroll-contain">
          {groups.map(([section, sectionItems]) => (
            <section key={section} className="border-b border-[var(--pub-border)] last:border-b-0">
              <div className="px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
                {section}
              </div>

              <div className="divide-y divide-[var(--pub-border)]">
                {sectionItems.map((item) => {
                  const look = sectionLook(item.section);

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3.5 px-5 py-4 transition-colors hover:bg-[var(--pub-accent-tint)]"
                    >
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-md)] ${look.bg} ${look.fg}`}
                      >
                        <PubIcon name={look.icon} className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold leading-6 text-[var(--pub-text)]">
                          {item.text}
                        </div>
                        <div className="mt-0.5 text-[13px] font-medium text-[var(--pub-text-soft)]">
                          {item.date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {items.length > 3 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="w-full border-t border-[var(--pub-border)] px-5 py-4 text-center text-sm font-semibold text-[var(--pub-accent-strong)] transition hover:bg-[var(--pub-accent-tint)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
            >
              {expanded ? "Згорнути оновлення" : "Переглянути всі оновлення"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
