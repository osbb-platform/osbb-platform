"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PublicThemeSwitch, PubCard, cx, PUB_FOCUS_RING, pubEyebrow } from "@/src/shared/ui/public";
import { PubIcon, type PubIconName } from "@/src/shared/ui/public/PublicIcons";

type NavigationItem = {
  label: string;
  href: () => string;
};

function normalizeBoardRoleLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "Голова правління";
  }

  const map: Record<string, string> = {
    "Председатель": "Голова правління",
    "Председатель правления": "Голова правління",
    "Голова ОСББ": "Голова правління",
    "Заместитель председателя": "Заступник голови правління",
    "Член правления": "Член правління",
    "Члены правления": "Члени правління",
    "Ревизионная комиссия": "Ревізійна комісія",
  };

  return map[normalized] ?? normalized;
}

/** Іконка розділу за маршрутом (тема-агностична, на currentColor). */
function sectionIcon(href: string): PubIconName {
  if (href.startsWith("/announcements")) return "megaphone";
  if (href.startsWith("/reports")) return "doc";
  if (href.startsWith("/plan")) return "wrench";
  if (href.startsWith("/meetings")) return "calendar";
  if (href.startsWith("/board")) return "users";
  if (href.startsWith("/information")) return "info";
  if (href.startsWith("/requisites")) return "bank";
  if (href.startsWith("/specialists")) return "phone";
  if (href.startsWith("/debtors")) return "coin";
  if (href.startsWith("/founding-documents")) return "doc";
  return "home";
}

type ChairmanPreview = {
  name: string;
  role?: string | null;
  phone?: string | null;
};

type PublicHouseSidePanelProps = {
  chairman?: ChairmanPreview | null;
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
  void slug;
  void districtColor;
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[var(--pub-overlay)] backdrop-blur-[2px] transition"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[390px] flex-col border-l border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)]">
        <div className="border-b border-[var(--pub-border)] bg-[var(--pub-accent-soft)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
                {houseCopy.sidePanel.allSections}
              </div>

              <div className="mt-2 text-[18px] font-semibold leading-tight text-[var(--pub-text)]">
                {houseName}
              </div>

              <div className="mt-2 truncate text-sm font-medium text-[var(--pub-text-muted)]">
                {houseAddress}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex max-w-[210px] truncate rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-accent-contrast)]">
                  {districtName}
                </span>
                <PublicThemeSwitch className="shrink-0" />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] shadow-[var(--pub-shadow-sm)] transition hover:bg-[var(--pub-bg-quiet)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
              aria-label={houseCopy.sidePanel.closeMenu}
            >
              <PubIcon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-2">
            {items.map((item) => {
              const href = item.href();
              const isActive =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));

              return (
                <Link
                  prefetch={false}
                  key={item.label}
                  href={href}
                  onClick={onClose}
                  className={`group flex items-center gap-3.5 rounded-[var(--r-lg)] px-4 py-3 transition ${
                    isActive
                      ? "bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]"
                      : "text-[var(--pub-text)] hover:bg-[var(--pub-accent-tint)]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] ${
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--pub-accent-contrast)_20%,transparent)] text-[var(--pub-accent-contrast)]"
                        : "bg-[var(--pub-bg-quiet)] text-[var(--pub-text-muted)]"
                    }`}
                  >
                    <PubIcon name={sectionIcon(href)} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-base font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {chairman ? (
          <div className="border-t border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-5">
            {(() => {
              const normalizedRole = normalizeBoardRoleLabel(chairman.role);

              return (
                <PubCard
                  elevation="sm"
                  elevated
                  padding="md"
                  className="rounded-[var(--r-lg)]"
                >
                  <div className={pubEyebrow}>Голова правління</div>

                  <div className="mt-3 text-[16px] font-semibold leading-tight text-[var(--pub-text)]">
                    {chairman.name}
                  </div>

                  {normalizedRole && normalizedRole !== "Голова правління" ? (
                    <div className="mt-1 text-sm leading-6 text-[var(--pub-text-muted)]">
                      {normalizedRole}
                    </div>
                  ) : null}

                  {chairman.phone ? (
                    <a
                      href={`tel:${chairman.phone}`}
                      className={cx(
                        "mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-5 text-sm font-semibold text-[var(--pub-accent-contrast)] transition hover:brightness-[1.04]",
                        PUB_FOCUS_RING,
                      )}
                    >
                      <PubIcon name="phone" className="h-4 w-4" />
                      {chairman.phone}
                    </a>
                  ) : null}
                </PubCard>
              );
            })()}
          </div>
        ) : null}
      </aside>
    </>
  );
}
