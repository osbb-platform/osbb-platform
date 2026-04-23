"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { sendEmployeeInvite } from "@/src/modules/employees/actions/sendEmployeeInvite";

const initialState = {
  error: null,
  success: null,
};

type SendInviteButtonProps = {
  membershipId: string;
  disabled?: boolean;
};

type SendInviteActionButtonProps = {
  membershipId: string;
  disabled?: boolean;
  onHandled: () => void;
};

function SendInviteActionButton({
  membershipId,
  disabled = false,
  onHandled,
}: SendInviteActionButtonProps) {
  const [state, formAction, isPending] = useActionState(
    sendEmployeeInvite,
    initialState,
  );

  const flash = useMemo(() => {
    return state.success
      ? { type: "success" as const, message: state.success }
      : state.error
        ? { type: "error" as const, message: state.error }
        : null;
  }, [state.success, state.error]);

  useEffect(() => {
    if (!flash) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onHandled();
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [flash, onHandled]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="membershipId" value={membershipId} />

      <button
        type="submit"
        disabled={disabled || isPending}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Надсилаємо..." : "Надіслати запрошення"}
      </button>

      {flash ? (
        <div
          className={
            flash.type === "success"
              ? "text-xs text-emerald-300"
              : "text-xs text-red-300"
          }
        >
          {flash.message}
        </div>
      ) : null}
    </form>
  );
}

export function SendInviteButton({
  membershipId,
  disabled = false,
}: SendInviteButtonProps) {
  const [actionKey, setActionKey] = useState(0);

  return (
    <SendInviteActionButton
      key={actionKey}
      membershipId={membershipId}
      disabled={disabled}
      onHandled={() => setActionKey((value) => value + 1)}
    />
  );
}
