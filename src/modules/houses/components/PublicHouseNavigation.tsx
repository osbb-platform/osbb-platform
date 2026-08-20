"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PublicHouseSidePanel } from "@/src/modules/houses/components/PublicHouseSidePanel";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

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
  { label: houseCopy.navigation.announcements, href: () => "/announcements" },
  { label: houseCopy.navigation.reports, href: () => "/reports" },
  { label: houseCopy.navigation.plan, href: () => "/plan" },
  { label: houseCopy.navigation.meetings, href: () => "/meetings" },
  { label: "Опитування", href: () => "/polls" },
];

const secondaryItems = [
  { label: houseCopy.navigation.board, href: () => "/board" },
  { label: houseCopy.navigation.information, href: () => "/information" },
  { label: houseCopy.navigation.requisites, href: () => "/requisites" },
  { label: houseCopy.navigation.specialists, href: () => "/specialists" },
  { label: houseCopy.navigation.debtors, href: () => "/debtors" },
  { label: houseCopy.navigation.foundingDocuments, href: () => "/founding-documents" },
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
      <div className="flex items-center gap-2.5">
        <nav className="hidden items-center gap-1.5 xl:flex">
          {primaryItems.map((item) => {
            const href = item.href();
            const isActive =
              pathname === href ||
              (href !== "/" && pathname.startsWith(href));

            return (
              <Link
                prefetch={false}
                key={item.label}
                href={href}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-[var(--r-pill)] px-4 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]"
                    : "text-[var(--pub-text-muted)] hover:bg-[var(--pub-accent-tint)] hover:text-[var(--pub-text)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="inline-flex h-12 items-center gap-2 rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface)] px-4 text-sm font-semibold text-[var(--pub-text)] transition hover:bg-[var(--pub-bg-quiet)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
          aria-label={houseCopy.navigation.openMenu}
        >
          <PubIcon name="menu" className="h-5 w-5" />
          <span className="hidden sm:inline">Розділи</span>
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
