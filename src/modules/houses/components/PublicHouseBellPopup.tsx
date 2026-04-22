import { houseCopy } from "@/src/shared/publicCopy/house";
import type { PublicHouseBellItem } from "@/src/modules/houses/services/getPublicHouseBellFeed";

type PublicHouseBellPopupProps = {
  items: PublicHouseBellItem[];
};

export function PublicHouseBellPopup({
  items,
}: PublicHouseBellPopupProps) {
  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[min(calc(100vw-1rem),23rem)] overflow-hidden rounded-[24px] border border-[#DDD4CA] bg-[#FBF8F3] shadow-[0_20px_60px_rgba(28,24,19,0.14)] sm:top-[calc(100%+12px)] sm:w-[min(92vw,400px)] sm:rounded-[30px] sm:shadow-[0_24px_80px_rgba(28,24,19,0.16)]">
      <div className="border-b border-[#E7DED4] bg-[#F4EEE7] px-4 py-4 sm:px-5 sm:py-5">
        <div className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#5D6980]">
          {houseCopy.bell.title}
        </div>
        <div className="mt-1.5 text-sm font-medium text-[#6F7C92]">
          {houseCopy.bell.period}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-5 text-sm leading-6 text-[#5F6775] sm:px-5 sm:py-6">
          {houseCopy.bell.empty}
        </div>
      ) : (
        <div className="max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain sm:max-h-[540px]">
          <div className="divide-y divide-[#ECE4DA]">
            {items.map((item) => (
              <div
                key={item.id}
                className="px-4 py-4 transition-colors hover:bg-[#F4EFE8] sm:px-5 sm:py-4.5"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5D6980]">
                      {item.section}
                    </div>

                    <div className="mt-2 text-[15px] font-medium leading-7 text-[#1E2740]">
                      {item.text}
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5 text-[12px] font-medium text-[#7A879C]">
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
