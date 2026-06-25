import Link from "next/link";
import type { PublicHouseHomeWidget } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";
import { PubIcon, type PubIconName } from "@/src/shared/ui/public/PublicIcons";

type Props = {
  widget: PublicHouseHomeWidget;
};

/** Семантика розділу: тон акцент-смужки/іконки + іконка. Форма картки — єдина. */
const widgetLook: Record<
  PublicHouseHomeWidget["kind"],
  { strip: string; iconBg: string; iconFg: string; icon: PubIconName }
> = {
  announcements: {
    strip: "bg-[var(--pub-accent)]",
    iconBg: "bg-[var(--pub-accent-soft)]",
    iconFg: "text-[var(--pub-accent-strong)]",
    icon: "megaphone",
  },
  plan: {
    strip: "bg-[var(--pub-warning-text)]",
    iconBg: "bg-[var(--pub-warning-bg)]",
    iconFg: "text-[var(--pub-warning-text)]",
    icon: "wrench",
  },
  meetings: {
    strip: "bg-[var(--pub-info-text)]",
    iconBg: "bg-[var(--pub-info-bg)]",
    iconFg: "text-[var(--pub-info-text)]",
    icon: "calendar",
  },
  debtors: {
    strip: "bg-[var(--pub-danger-text)]",
    iconBg: "bg-[var(--pub-danger-bg)]",
    iconFg: "text-[var(--pub-danger-text)]",
    icon: "coin",
  },
};

export function PublicHouseDashboardCard({ widget }: Props) {
  const look = widgetLook[widget.kind];

  return (
    <Link
      prefetch={false}
      href={widget.href}
      className="group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 pl-6 shadow-[var(--pub-shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--pub-shadow-md)] sm:min-h-[300px] sm:p-6 sm:pl-7"
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-5 bottom-5 w-1 rounded-[var(--r-pill)] ${look.strip}`}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-[var(--r-lg)] ${look.iconBg} ${look.iconFg}`}
        >
          <PubIcon name={look.icon} className="h-[22px] w-[22px]" />
        </span>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {widget.badge ? (
            <span className="inline-flex rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pub-text-muted)]">
              {widget.badge}
            </span>
          ) : null}

          {widget.freshnessLabel ? (
            <span className="inline-flex rounded-[var(--r-pill)] border border-[var(--pub-success-border)] bg-[var(--pub-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pub-success-text)]">
              {widget.freshnessLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex-1">
        <h3 className="max-w-[22ch] font-[var(--font-serif)] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--pub-text)] sm:text-[32px]">
          {widget.headline}
        </h3>

        <p className="mt-3 text-sm leading-6 text-[var(--pub-text-muted)] sm:text-base sm:leading-7">
          {widget.description}
        </p>

        {widget.meta.length > 0 ? (
          <div className="mt-4 space-y-2 sm:mt-5">
            {widget.meta.map((item) => (
              <div
                key={item}
                className="rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-4 py-2.5 text-xs font-medium leading-5 text-[var(--pub-text-muted)]"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pub-accent-strong)] sm:mt-6">
        {widget.ctaLabel}
        <PubIcon
          name="chevron-right"
          className="h-[15px] w-[15px] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
