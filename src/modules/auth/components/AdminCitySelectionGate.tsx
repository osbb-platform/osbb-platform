import { logoutAdmin } from "@/src/modules/auth/actions/logoutAdmin";
import { AdminCitySwitcherForm } from "@/src/modules/auth/components/AdminCitySwitcherForm";
import type { AdminCityOption } from "@/src/modules/auth/services/getAdminCityOptions";
import { adminGhostButtonClass } from "@/src/shared/ui/admin/adminStyles";

type AdminCitySelectionGateProps = {
  cities: AdminCityOption[];
};

export function AdminCitySelectionGate({
  cities,
}: AdminCitySelectionGateProps) {
  return (
    <main className="cms-theme-root flex min-h-screen items-center justify-center bg-[var(--cms-bg)] px-5 py-12 text-[var(--cms-text)]">
      <section className="w-full max-w-lg rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-sm)] sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Оберіть місто
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
          Місто визначає робочий контекст адмін-панелі.
        </p>

        {cities.length > 0 ? (
          <div className="mt-6">
            <AdminCitySwitcherForm
              cities={cities}
              activeCityId={null}
              returnTo="/admin"
              submitLabel="Продовжити"
            />
          </div>
        ) : (
          <div className="mt-6 rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4 text-sm text-[var(--cms-text-muted)]">
            Активні міста не налаштовані.
          </div>
        )}

        <form action={logoutAdmin} className="mt-3 flex justify-center">
          <button type="submit" className={adminGhostButtonClass}>
            Вийти
          </button>
        </form>
      </section>
    </main>
  );
}
