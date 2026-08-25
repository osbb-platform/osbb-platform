"use client";

import { useActionState, useEffect, useId } from "react";

import {
  setAdminActiveCity,
  type SetAdminActiveCityState,
} from "@/src/modules/auth/actions/setAdminActiveCity";
import type { AdminCityOption } from "@/src/modules/auth/services/getAdminCityOptions";
import {
  adminPrimaryButtonClass,
  adminSelectClass,
} from "@/src/shared/ui/admin/adminStyles";

const initialState: SetAdminActiveCityState = {
  error: null,
  destination: null,
};

type AdminCitySwitcherFormProps = {
  cities: AdminCityOption[];
  activeCityId: string | null;
  returnTo: "/admin" | "/admin/profile";
  submitLabel: string;
  compact?: boolean;
};

export function AdminCitySwitcherForm({
  cities,
  activeCityId,
  returnTo,
  submitLabel,
  compact = false,
}: AdminCitySwitcherFormProps) {
  const selectId = useId();
  const [state, formAction, pending] = useActionState(
    setAdminActiveCity,
    initialState,
  );

  useEffect(() => {
    if (!state.destination) {
      return;
    }

    window.location.assign(state.destination);
  }, [state.destination]);

  return (
    <form
      action={formAction}
      className={
        compact
          ? "grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
          : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      }
    >
      <input type="hidden" name="returnTo" value={returnTo} />

      <label htmlFor={selectId} className="sr-only">
        Місто
      </label>
      <select
        id={selectId}
        name="cityId"
        required
        defaultValue={activeCityId ?? ""}
        disabled={pending}
        className={adminSelectClass}
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

      <button
        type="submit"
        disabled={pending}
        className={`${adminPrimaryButtonClass} shrink-0`}
      >
        {pending ? "Змінюємо..." : submitLabel}
      </button>

      {state.error ? (
        <p className="text-sm text-[var(--cms-danger-text)] sm:col-span-2">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
