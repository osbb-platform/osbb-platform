"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PublicHouseSidePanel } from "@/src/modules/houses/components/PublicHouseSidePanel";

type ChairmanPreview = {
  name: string;
  role?: string | null;
  phone?: string | null;
};

type PublicHouseNavigationProps = {
  chairman?: ChairmanPreview | null;
  slug: string;
  houseName: string;
  houseAddress: string;
  districtName: string;
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
  { label: houseCopy.navigation.foundingDocuments, href: (slug: string) => `/house/${slug}/founding-documents` },
];

export function PublicHouseNavigation({
  chairman,
  slug,
  houseName,
  houseAddress,
  districtName,
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
                    ? "shadow-sm border"
                    : "border border-[#DDD6CE] bg-[#F7F5F2] text-slate-700 hover:border-[#D8CEC2] hover:bg-[#F0E9E1] hover:-translate-y-[1px] hover:shadow-sm"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: `${districtColor}20`,
                        borderColor: `${districtColor}55`,
                        color: districtColor,
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#DDD6CE] bg-[#F7F5F2] text-slate-800 transition hover:border-[#D8CEC2] hover:bg-[#F0E9E1] hover:-translate-y-[1px] hover:shadow-sm"
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
        chairman={chairman}
        slug={slug}
        houseName={houseName}
        houseAddress={houseAddress}
        districtName={districtName}
        districtColor={districtColor}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        items={[...primaryItems, ...secondaryItems]}
      />
    </>
  );
}