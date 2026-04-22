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
  chairman?: any;
  slug: string;
  houseName: string;
  houseAddress: string;
  districtName: string;
  districtColor: string;
  open: boolean;
  onClose: () => void;
  items: NavigationItem[];
};

export function PublicHouseSidePanel({ chairman,
  slug,
  houseName,
  houseAddress,
  districtName,
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

      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[420px] flex-col border-l border-[#DDD4CA] bg-[#F7F5F2] shadow-2xl">
        <div
          className="flex items-start justify-between border-b px-5 py-5"
          style={{
            backgroundColor: `${districtColor}26`,
            borderColor: `${districtColor}30`,
          }}
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#66758A]">
              {houseCopy.sidePanel.allSections}
            </div>

            <div className="mt-2 text-[18px] font-semibold leading-tight text-[#1F2A37]">
              {houseName}
            </div>

            <div className="mt-2 truncate text-sm font-medium text-[#5B6B7C]">
              {houseAddress}
            </div>

            <div
              className="mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1F2A37]"
              style={{
                backgroundColor: `${districtColor}18`,
                borderColor: `${districtColor}45`,
              }}
            >
              {districtName}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#DDD4CA] bg-[#F7F5F2] text-slate-700 shadow-sm transition hover:bg-[#F0E9E1] hover:-translate-y-[1px]"
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
                      ? "border-transparent text-slate-900 shadow-sm"
                      : "border-[#DDD6CE] bg-[#F7F5F2] text-slate-900 hover:bg-[#F0E9E1] hover:-translate-y-[1px]"
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

        <div className="border-t border-[#DDD4CA] px-5 py-5">
          {chairman ? (
          <div className="rounded-[24px] border border-[#DDD4CA] bg-[#ECE6DF] p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#66758A]">
              Голова ОСББ
            </div>

            <div className="mt-3 text-[16px] font-semibold text-[#1F2A37]">
              {chairman.name}
            </div>

            <div className="mt-1 text-sm text-[#5B6B7C]">
              {chairman.role}
            </div>

            {chairman.phone ? (
              <div className="mt-3 text-sm font-medium text-[#2F3A4F]">
                {chairman.phone}
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      </aside>
    </>
  );
}