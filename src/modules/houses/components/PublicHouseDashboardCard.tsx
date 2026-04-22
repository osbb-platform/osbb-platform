import Link from "next/link";
import type { PublicHouseHomeWidget } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";

type Props = {
  widget: PublicHouseHomeWidget;
};

const widgetToneMap = {
  announcements: {
    shell: "bg-[#FDFCFB] border-[#DDD4CA] hover:border-[#CFEED1] hover:bg-white",
    pill: "border-[#CFEED1] bg-[#F3FBF3] text-[#3F7A3D]",
    dot: "bg-[#85E874]",
    badge: "border-[#CFEED1] bg-[#F6FCF5] text-[#4A6A47]",
    freshness: "bg-[#22C55E] text-white",
    meta: "border-[#D7E8D5] bg-[#F6FBF4] text-[#53634F]",
    cta: "border-[#CFEED1] bg-[#F3FBF3] text-[#2F5E2E] group-hover:bg-[#EAF8EA]",
  },
  plan: {
    shell: "bg-[#FDFCFB] border-[#DDD4CA] hover:border-[#EADFBF] hover:bg-white",
    pill: "border-[#EADFBF] bg-[#FBF7EC] text-[#8A6B1F]",
    dot: "bg-[#E7C873]",
    badge: "border-[#EADFBF] bg-[#FCF8EF] text-[#7A6430]",
    freshness: "bg-[#22C55E] text-white",
    meta: "border-[#E8DFC7] bg-[#FBF7EF] text-[#6E6248]",
    cta: "border-[#EADFBF] bg-[#FBF7EC] text-[#6F5717] group-hover:bg-[#F6EFD9]",
  },
  meetings: {
    shell: "bg-[#FDFCFB] border-[#DDD4CA] hover:border-[#D4E1F7] hover:bg-white",
    pill: "border-[#D4E1F7] bg-[#F2F6FD] text-[#466694]",
    dot: "bg-[#7FA8E8]",
    badge: "border-[#D4E1F7] bg-[#F4F7FD] text-[#526A8C]",
    freshness: "bg-[#22C55E] text-white",
    meta: "border-[#DCE5F4] bg-[#F5F8FD] text-[#536277]",
    cta: "border-[#D4E1F7] bg-[#F2F6FD] text-[#36547E] group-hover:bg-[#EAF1FB]",
  },
  debtors: {
    shell: "bg-[#FDFCFB] border-[#DDD4CA] hover:border-[#F0D0D0] hover:bg-white",
    pill: "border-[#F0D0D0] bg-[#FDF3F3] text-[#9A5757]",
    dot: "bg-[#E8A4A4]",
    badge: "border-[#F0D0D0] bg-[#FDF6F6] text-[#8A6666]",
    freshness: "bg-[#22C55E] text-white",
    meta: "border-[#F0DEDE] bg-[#FCF7F7] text-[#735F5F]",
    cta: "border-[#F0D0D0] bg-[#FDF3F3] text-[#7E4242] group-hover:bg-[#F9E9E9]",
  },
} as const;

export function PublicHouseDashboardCard({ widget }: Props) {
  const tone = widgetToneMap[widget.kind];

  return (
    <Link
      href={widget.href}
      className={`group flex h-full min-h-[220px] flex-col rounded-[28px] border p-4 shadow-[0_10px_30px_rgba(28,24,19,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(28,24,19,0.08)] sm:min-h-[320px] sm:rounded-[32px] sm:p-6 ${tone.shell}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.pill}`}
        >
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          {widget.title}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {widget.badge ? (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
            >
              {widget.badge}
            </span>
          ) : null}

          {widget.freshnessLabel ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.freshness}`}
            >
              {widget.freshnessLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex-1">
        <h3 className="max-w-[22ch] text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-950 sm:text-[36px]">
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
                className={`rounded-2xl border px-4 py-2.5 text-xs font-medium leading-5 ${tone.meta}`}
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={`mt-5 inline-flex min-h-[46px] items-center justify-center rounded-full border px-4 text-sm font-semibold transition sm:mt-6 sm:min-h-[48px] sm:px-5 ${tone.cta}`}
      >
        {widget.ctaLabel}
      </div>
    </Link>
  );
}
