import { houseCopy } from "@/src/shared/publicCopy/house";
import type { PublicHouseBellItem } from "@/src/modules/houses/services/getPublicHouseBellFeed";

type PublicHouseBellPopupProps = {
  items: PublicHouseBellItem[];
};

export function PublicHouseBellPopup({
  items,
}: PublicHouseBellPopupProps) {
  return (
    <div className="absolute right-0 top-[calc(100%+12px)] z-[70] w-[min(92vw,380px)] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {houseCopy.bell.title}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {houseCopy.bell.period}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-500">
          {houseCopy.bell.period} {houseCopy.bell.empty}
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto overscroll-contain">
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {item.section}
                    </div>

                    <div className="mt-1 text-sm leading-6 text-slate-900">
                      {item.text}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-slate-400">
                    {item.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
