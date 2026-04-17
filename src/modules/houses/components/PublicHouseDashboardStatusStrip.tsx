import type { PublicHouseHomeStatusItem } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";

type Props = {
  items: PublicHouseHomeStatusItem[];
};

export function PublicHouseDashboardStatusStrip({ items }: Props) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {item.label}
            </div>

            <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
