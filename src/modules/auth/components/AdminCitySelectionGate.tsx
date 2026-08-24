import { setAdminActiveCity } from "@/src/modules/auth/actions/setAdminActiveCity";
import type { AdminCityOption } from "@/src/modules/auth/services/getAdminCityOptions";
import { logoutAdmin } from "@/src/modules/auth/actions/logoutAdmin";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type AdminCitySelectionGateProps = {
  cities: AdminCityOption[];
};

export function AdminCitySelectionGate({
  cities,
}: AdminCitySelectionGateProps) {
  return (
    <main className="cms-theme-root flex min-h-screen items-center justify-center bg-[var(--cms-bg)] px-6 py-16 text-[var(--cms-text)]">
      <section className="w-full max-w-2xl rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-8 shadow-[var(--cms-shadow-sm)]">
        <div className="inline-flex rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
          Superadmin
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Оберіть місто для роботи
        </h1>

        <p className="mt-3 text-base leading-7 text-[var(--cms-text-muted)]">
          Активне місто визначає робочий контекст адмін-панелі. Його можна
          змінити пізніше у профілі.
        </p>

        {cities.length > 0 ? (
          <form action={setAdminActiveCity} className="mt-8 space-y-4">
            <input type="hidden" name="returnTo" value="/admin" />

            <label className="block text-sm font-medium text-[var(--cms-text-muted)]">
              Місто
            </label>

            <select
              name="cityId"
              required
              defaultValue=""
              className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-base text-[var(--cms-text)] outline-none focus:border-[var(--cms-border-strong)]"
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
              Продовжити
            </button>
          </form>
        ) : (
          <div className="mt-8 rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4 text-sm text-[var(--cms-text-muted)]">
            Активні міста не налаштовані.
          </div>
        )}

        <form action={logoutAdmin} className="mt-4">
          <button type="submit" className={adminSecondaryButtonClass}>
            Вийти
          </button>
        </form>
      </section>
    </main>
  );
}
