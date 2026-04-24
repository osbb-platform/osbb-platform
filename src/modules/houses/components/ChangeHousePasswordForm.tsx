"use client";

import { useActionState, useState } from "react";
import { changeHousePassword } from "@/src/modules/houses/actions/changeHousePassword";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type ChangeHousePasswordFormProps = {
  houseId: string;
  houseSlug: string;
};

type ChangeHousePasswordState = {
  error: string | null;
  successMessage: string | null;
};

const initialState: ChangeHousePasswordState = {
  error: null,
  successMessage: null,
};

function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function ChangeHousePasswordForm({
  houseId,
  houseSlug,
}: ChangeHousePasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    changeHousePassword,
    initialState,
  );
  const [newAccessCode, setNewAccessCode] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Поточний код доступу
        </label>
        <input
          name="oldAccessCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="Введіть поточний код"
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Новий код доступу
        </label>
        <input
          name="newAccessCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={newAccessCode}
          onChange={(event) =>
            setNewAccessCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="Введіть новий 6-значний код"
          className={adminInputClass}
        />

        <button
          type="button"
          onClick={() => setNewAccessCode(generateAccessCode())}
          className="mt-3 text-sm font-medium text-[var(--cms-text-muted)] transition hover:text-[var(--cms-text)]"
        >
          Згенерувати автоматично
        </button>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      {state.successMessage ? (
        <div className="rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {state.successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`${adminPrimaryButtonClass} disabled:opacity-60`}
      >
        {isPending ? "Зберігаємо..." : "Оновити код доступу"}
      </button>
    </form>
  );
}
