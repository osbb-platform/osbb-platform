"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateEmployee,
  type UpdateEmployeeState,
} from "@/src/modules/employees/actions/updateEmployee";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type CityOption = {
  id: string;
  name: string;
  slug: string;
};

const initialState: UpdateEmployeeState = {
  error: null,
  success: null,
};

export function UpdateEmployeeForm({
  membershipId,
  currentRole,
  role,
  cityId,
  cities,
  onSuccess,
}: {
  membershipId: string;
  currentRole: string | null;
  role: string | null;
  cityId: string | null;
  cities: CityOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateEmployee, initialState);
  const canSelectCity = currentRole === ROLES.SUPERADMIN;

  useEffect(() => {
    if (!state.success) return;

    router.refresh();
    onSuccess?.();
  }, [onSuccess, router, state.success]);

  return (
    <form
      action={action}
      className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4"
    >
      <input type="hidden" name="membershipId" value={membershipId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={`mb-2 block ${adminTextLabelClass}`}>Роль</label>
          <select
            name="role"
            defaultValue={role ?? ROLES.CONTENT_MANAGER}
            className={adminInputClass}
          >
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.MANAGER}>Manager</option>
            <option value={ROLES.CONTENT_MANAGER}>Контент-менеджер</option>
          </select>
        </div>

        <div>
          <label className={`mb-2 block ${adminTextLabelClass}`}>Місто</label>
          <select
            name="cityId"
            defaultValue={cityId ?? cities[0]?.id ?? ""}
            disabled={!canSelectCity}
            className={adminInputClass}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          {!canSelectCity ? (
            <input type="hidden" name="cityId" value={cityId ?? ""} />
          ) : null}
        </div>
      </div>

      {state.error ? (
        <div className="mt-3 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`mt-4 ${adminPrimaryButtonClass} disabled:opacity-60`}
      >
        {pending ? "Зберігаємо..." : "Зберегти роль і місто"}
      </button>
    </form>
  );
}
