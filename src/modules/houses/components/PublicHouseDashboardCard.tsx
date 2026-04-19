import Link from "next/link";
import type { PublicHouseHomeWidget } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";

type Props = {
  widget: PublicHouseHomeWidget;
};

export function PublicHouseDashboardCard({ widget }: Props) {
  return (
    <Link
      href={widget.href}
      className="group flex h-full min-h-[220px] flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[320px] sm:rounded-[32px] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {widget.title}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {widget.badge ? (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              {widget.badge}
            </span>
          ) : null}

          {widget.freshnessLabel ? (
            <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
              {widget.freshnessLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex-1">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {widget.headline}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          {widget.description}
        </p>

        {widget.meta.length > 0 ? (
          <div className="mt-4 space-y-2 sm:mt-5">
            {widget.meta.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 font-medium text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition group-hover:bg-slate-100 sm:mt-6 sm:min-h-[48px] sm:px-5">
        {widget.ctaLabel}
      </div>
    </Link>
  );
}
