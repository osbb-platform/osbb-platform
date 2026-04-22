import type { PublicHouseHomeStatusItem } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";

type Props = {
  items: PublicHouseHomeStatusItem[];
};

export function PublicHouseDashboardStatusStrip({ items }: Props) {
  return (
    <section className="rounded-[32px] border border-[#DDD4CA] bg-[#EEE8E1] p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[26px] border border-[#DDD4CA] bg-[#F6F2EC] px-5 py-6 text-center shadow-[0_1px_0_rgba(255,255,255,0.55)_inset]"
          >
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F5A54]">
              {item.label}
            </div>

            <div className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.02em] text-slate-950 sm:text-[30px]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
