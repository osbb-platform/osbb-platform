import { houseHomeCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import type { PublicHouseHomeAlert } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type Props = {
  alert: PublicHouseHomeAlert;
};

export function PublicHouseDashboardAlert({ alert }: Props) {
  if (!alert) {
    return null;
  }

  return (
    <Link
      prefetch={false}
      href={alert.href}
      className="group flex items-center gap-4 rounded-[var(--r-2xl)] border border-[var(--pub-warning-border)] bg-[var(--pub-warning-bg)] p-5 transition duration-200 hover:shadow-[var(--pub-shadow-md)] sm:gap-5 sm:p-6"
    >
      <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-lg)] bg-[color-mix(in_srgb,var(--pub-warning-text)_18%,transparent)] text-[var(--pub-warning-text)] sm:flex">
        <PubIcon name="alert" className="h-6 w-6" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--pub-warning-border)] bg-[color-mix(in_srgb,var(--pub-warning-text)_12%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-warning-text)]">
            <span className="h-2 w-2 rounded-full bg-current" />
            {houseHomeCopy.alert.label}
          </span>

          {alert.badge ? (
            <span className="inline-flex rounded-[var(--r-pill)] bg-[var(--pub-warning-text)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-surface)]">
              {alert.badge}
            </span>
          ) : null}
        </div>

        <h2 className="mt-3 text-lg font-semibold tracking-tight text-[var(--pub-text)] sm:text-xl">
          {alert.title}
        </h2>

        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--pub-text-muted)] sm:text-[15px]">
          {alert.description}
        </p>
      </div>

      <span className="hidden shrink-0 items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-5 py-3 text-sm font-semibold text-[var(--pub-accent-contrast)] transition group-hover:brightness-[1.04] sm:inline-flex">
        {houseHomeCopy.alert.open}
        <PubIcon name="chevron-right" className="h-[15px] w-[15px]" />
      </span>
    </Link>
  );
}
