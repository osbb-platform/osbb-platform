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
      className="group block rounded-[32px] border border-[#E6D3A3] bg-[#F5EFE4] p-5 shadow-[0_10px_30px_rgba(28,24,19,0.05)] transition duration-200 hover:shadow-[0_16px_40px_rgba(28,24,19,0.08)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E6D3A3] bg-[#FBF6EC] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7617]">
              <span className="h-2 w-2 rounded-full bg-[#E7C873]" />
              {houseHomeCopy.alert.label}
            </span>

            {alert.badge ? (
              <span className="inline-flex rounded-full border border-[#E2BF75] bg-[#F6D88D] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6E5513]">
                {alert.badge}
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#1F2A37] sm:text-2xl">
            {alert.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5B6B7C] sm:text-base">
            {alert.description}
          </p>
        </div>

        <span className="inline-flex min-h-[46px] items-center rounded-full border border-[#D8CEC2] bg-[#F6F2EC] px-5 text-sm font-semibold text-[#1F2A37] transition-all duration-200 group-hover:bg-[#F0E9E1]">
          {houseHomeCopy.alert.open}
        </span>
      </div>
    </Link>
  );
}
