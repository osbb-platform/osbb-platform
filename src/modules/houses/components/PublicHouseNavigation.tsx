"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PublicHouseSidePanel } from "@/src/modules/houses/components/PublicHouseSidePanel";

type PublicHouseNavigationProps = {
  slug: string;
  houseName: string;
  districtColor: string;
};

const primaryItems = [
  { label: houseCopy.navigation.announcements, href: (slug: string) => `/house/${slug}/announcements` },
  { label: houseCopy.navigation.reports, href: (slug: string) => `/house/${slug}/reports` },
  { label: houseCopy.navigation.plan, href: (slug: string) => `/house/${slug}/plan` },
  { label: houseCopy.navigation.meetings, href: (slug: string) => `/house/${slug}/meetings` },
];

const secondaryItems = [
  { label: houseCopy.navigation.board, href: (slug: string) => `/house/${slug}/board` },
  { label: houseCopy.navigation.information, href: (slug: string) => `/house/${slug}/information` },
  { label: houseCopy.navigation.requisites, href: (slug: string) => `/house/${slug}/requisites` },
  { label: houseCopy.navigation.specialists, href: (slug: string) => `/house/${slug}/specialists` },
  { label: houseCopy.navigation.debtors, href: (slug: string) => `/house/${slug}/debtors` },
];

export function PublicHouseNavigation({
  slug,
  houseName,
  districtColor,
}: PublicHouseNavigationProps) {
  const pathname = usePathname();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <nav className="hidden items-center gap-2 xl:flex">
          {primaryItems.map((item) => {
            const href = item.href(slug);
            const isActive =
              pathname === href ||
              (href !== `/house/${slug}` && pathname.startsWith(href));

            return (
              <Link
                key={item.label}
                href={href}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                  isActive
                    ? "text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                style={isActive ? { backgroundColor: districtColor } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50"
          aria-label={houseCopy.navigation.openMenu}
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
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>
      </div>

      <PublicHouseSidePanel
        slug={slug}
        houseName={houseName}
        districtColor={districtColor}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        items={[...primaryItems, ...secondaryItems]}
      />
    </>
  );
}