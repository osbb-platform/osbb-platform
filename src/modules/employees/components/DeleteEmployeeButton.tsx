"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { deleteEmployee } from "@/src/modules/employees/actions/deleteEmployee";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { adminDangerButtonClass } from "@/src/shared/ui/admin/adminStyles";

const initialState = {
  error: null,
  success: null,
};

type DeleteEmployeeButtonProps = {
  membershipId: string;
  employeeLabel: string;
  variant?: "icon" | "full";
};

type DeleteEmployeeActionButtonProps = {
  membershipId: string;
  employeeLabel: string;
  variant?: "icon" | "full";
  onHandled: () => void;
};

function DeleteEmployeeActionButton({
  membershipId,
  employeeLabel,
  variant = "full",
  onHandled,
}: DeleteEmployeeActionButtonProps) {
  void variant;

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    deleteEmployee,
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

  function handleOpenConfirm() {
    if (isPending) return;
    setIsConfirmOpen(true);
  }

  function handleConfirmDelete() {
    setIsConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="membershipId" value={membershipId} />

        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={isPending}
          className={`${adminDangerButtonClass} disabled:opacity-60`}
        >
          {isPending ? "Видаляємо..." : "Видалити співробітника"}
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

      <PlatformConfirmModal
        open={isConfirmOpen}
        tone="destructive"
        title="Видалити співробітника?"
        description={`Після підтвердження співробітник «${employeeLabel}» буде видалений із CMS. Якщо співробітник уже підключився, доступ до системи буде закрито.`}
        confirmLabel="Видалити співробітника"
        pendingLabel="Видаляємо..."
        isPending={isPending}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export function DeleteEmployeeButton({
  membershipId,
  employeeLabel,
  variant = "full",
}: DeleteEmployeeButtonProps) {
  const [actionKey, setActionKey] = useState(0);

  return (
    <DeleteEmployeeActionButton
      key={actionKey}
      membershipId={membershipId}
      employeeLabel={employeeLabel}
      variant={variant}
      onHandled={() => setActionKey((value) => value + 1)}
    />
  );
}
