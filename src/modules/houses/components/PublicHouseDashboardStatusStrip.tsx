import type { PublicHouseHomeStatusItem } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";

type Props = {
  items: PublicHouseHomeStatusItem[];
};

export function PublicHouseDashboardStatusStrip({ items }: Props) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
      <div className="mb-4 text-center">
        <h2 className="font-[var(--font-serif)] text-[22px] font-semibold tracking-tight text-[var(--pub-text)] sm:text-[26px]">
          Актуальний розмір внеску
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-6 text-center"
          >
            <div className="text-[13px] font-semibold uppercase leading-snug tracking-[0.08em] text-[var(--pub-text-soft)]">
              {item.label}
            </div>

            <div className="mt-2 break-words font-[var(--font-serif)] text-[20px] font-semibold leading-snug text-[var(--pub-text)] sm:text-[22px]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
