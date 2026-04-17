"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

type NavigationItem = {
  label: string;
  href: (slug: string) => string;
};

type PublicHouseSidePanelProps = {
  slug: string;
  houseName: string;
  districtColor: string;
  open: boolean;
  onClose: () => void;
  items: NavigationItem[];
};

export function PublicHouseSidePanel({
  slug,
  houseName,
  districtColor,
  open,
  onClose,
  items,
}: PublicHouseSidePanelProps) {
  const pathname = usePathname();

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/30 transition"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div
          className="flex items-center justify-between border-b border-white/10 px-5 py-5"
          style={{ backgroundColor: districtColor }}
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {houseCopy.sidePanel.allSections}
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {houseName}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label={houseCopy.sidePanel.closeMenu}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-3">
            {items.map((item) => {
              const href = item.href(slug);
              const isActive =
                pathname === href ||
                (href !== `/house/${slug}` && pathname.startsWith(href));

              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={onClose}
                  className={`rounded-[22px] border px-4 py-3 transition ${
                    isActive
                      ? "border-transparent text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                  style={
                    isActive
                      ? ({ backgroundColor: districtColor } as CSSProperties)
                      : undefined
                  }
                >
                  <div className="text-base font-semibold">{item.label}</div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {houseCopy.sidePanel.managementCompany}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              ТОВ Бухгалтер онлайн
            </div>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {houseCopy.sidePanel.description}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}