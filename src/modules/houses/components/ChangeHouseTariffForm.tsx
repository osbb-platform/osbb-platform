"use client";

import { useActionState, useState } from "react";
import { changeHouseTariff } from "@/src/modules/houses/actions/changeHouseTariff";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type Props = {
  houseId: string;
  houseSlug: string;
  initialValue?: number | null;
};

type State = {
  error: string | null;
  successMessage: string | null;
};

const initialState: State = {
  error: null,
  successMessage: null,
};

export function ChangeHouseTariffForm({
  houseId,
  houseSlug,
  initialValue,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    changeHouseTariff,
    initialState,
  );
  const [value, setValue] = useState(
    initialValue !== null && initialValue !== undefined
      ? String(initialValue)
      : "",
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Тариф (₴)
        </label>
        <input
          name="tariff"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Введіть суму"
          className={adminInputClass}
        />
      </div>

      {state.error && (
        <div role="alert" className="text-sm text-[var(--cms-danger-text)]">{state.error}</div>
      )}

      {state.successMessage && (
        <div role="status" className="text-sm text-[var(--cms-success-text)]">{state.successMessage}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={adminPrimaryButtonClass}
      >
        {isPending ? "Зберігаємо..." : "Зберегти"}
      </button>
    </form>
  );
}
