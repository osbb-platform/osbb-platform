import { AdminCitySwitcherForm } from "@/src/modules/auth/components/AdminCitySwitcherForm";
import type { AdminCityOption } from "@/src/modules/auth/services/getAdminCityOptions";

type AdminCityProfileSelectorProps = {
  cities: AdminCityOption[];
  activeCityId: string | null;
};

export function AdminCityProfileSelector({
  cities,
  activeCityId,
}: AdminCityProfileSelectorProps) {
  if (cities.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <div className="flex w-full max-w-2xl flex-col gap-2 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-3 sm:flex-row sm:items-center">
        <div className="shrink-0 px-1 text-xs font-semibold text-[var(--cms-text-muted)]">
          Робоче місто
        </div>

        <AdminCitySwitcherForm
          cities={cities}
          activeCityId={activeCityId}
          returnTo="/admin/profile"
          submitLabel="Застосувати"
          compact
        />
      </div>
    </div>
  );
}
