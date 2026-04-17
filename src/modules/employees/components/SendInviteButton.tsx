"use client";

import { useActionState } from "react";
import { sendEmployeeInvite } from "@/src/modules/employees/actions/sendEmployeeInvite";

const initialState = {
  error: null,
  success: null,
};

type SendInviteButtonProps = {
  membershipId: string;
  disabled?: boolean;
};

export function SendInviteButton({
  membershipId,
  disabled = false,
}: SendInviteButtonProps) {
  const [state, formAction, isPending] = useActionState(
    sendEmployeeInvite,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="membershipId" value={membershipId} />

      <button
        type="submit"
        disabled={disabled || isPending}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Отправляем..." : "Отправить инвайт"}
      </button>

      {state.error ? (
        <div className="text-xs text-red-300">{state.error}</div>
      ) : null}

      {state.success ? (
        <div className="text-xs text-emerald-300">{state.success}</div>
      ) : null}
    </form>
  );
}
