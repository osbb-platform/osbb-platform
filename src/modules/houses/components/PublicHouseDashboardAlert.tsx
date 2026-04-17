import { houseHomeCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import type { PublicHouseHomeAlert } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";

type Props = {
  alert: PublicHouseHomeAlert;
};

export function PublicHouseDashboardAlert({ alert }: Props) {
  if (!alert) {
    return null;
  }

  return (
    <Link
      href={alert.href}
      className="group block rounded-[32px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm transition hover:shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              {houseHomeCopy.alert.label}
            </span>

            {alert.badge ? (
              <span className="inline-flex rounded-full bg-amber-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {alert.badge}
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {alert.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
            {alert.description}
          </p>
        </div>

        <span className="inline-flex min-h-[46px] items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition group-hover:bg-slate-50">
          {houseHomeCopy.alert.open}
        </span>
      </div>
    </Link>
  );
}
