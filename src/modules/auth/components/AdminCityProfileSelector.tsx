import { setAdminActiveCity } from "@/src/modules/auth/actions/setAdminActiveCity";
import type { AdminCityOption } from "@/src/modules/auth/services/getAdminCityOptions";
import { adminPrimaryButtonClass } from "@/src/shared/ui/admin/adminStyles";

type AdminCityProfileSelectorProps = {
  cities: AdminCityOption[];
  activeCityId: string | null;
};

export function AdminCityProfileSelector({
  cities,
  activeCityId,
}: AdminCityProfileSelectorProps) {
  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <div className="inline-flex rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
        Робочий контекст
      </div>

      <h2 className="mt-4 text-2xl font-semibold text-[var(--cms-text)]">
        Активне місто
      </h2>

      <p className="mt-2 text-sm leading-7 text-[var(--cms-text-muted)]">
        Перемикання змінює server-side контекст superadmin. Дані інших міст
        не змішуються в одному робочому контексті.
      </p>

      <form action={setAdminActiveCity} className="mt-5 flex flex-col gap-3 md:flex-row">
        <input type="hidden" name="returnTo" value="/admin/profile" />

        <select
          name="cityId"
          required
          defaultValue={activeCityId ?? ""}
          className="min-w-0 flex-1 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-base text-[var(--cms-text)] outline-none focus:border-[var(--cms-border-strong)]"
        >
          <option value="" disabled>
            Оберіть місто
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>

        <button type="submit" className={adminPrimaryButtonClass}>
          Змінити місто
        </button>
      </form>
    </section>
  );
}
