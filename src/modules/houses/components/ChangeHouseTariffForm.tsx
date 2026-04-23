"use client";

import { useActionState, useState } from "react";
import { changeHouseTariff } from "@/src/modules/houses/actions/changeHouseTariff";

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
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Тариф (₴)
        </label>
        <input
          name="tariff"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Введіть суму"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
        />
      </div>

      {state.error && (
        <div className="text-red-400 text-sm">{state.error}</div>
      )}

      {state.successMessage && (
        <div className="text-green-400 text-sm">{state.successMessage}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-white text-black px-5 py-3 rounded-2xl"
      >
        {isPending ? "Зберігаємо..." : "Зберегти"}
      </button>
    </form>
  );
}
