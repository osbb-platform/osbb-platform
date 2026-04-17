"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { deleteEmployee } from "@/src/modules/employees/actions/deleteEmployee";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";

const initialState = {
  error: null,
  success: null,
};

type DeleteEmployeeButtonProps = {
  membershipId: string;
  employeeLabel: string;
  variant?: "icon" | "full";
};

export function DeleteEmployeeButton({
  membershipId,
  employeeLabel,
  variant = "full",
}: DeleteEmployeeButtonProps) {
  void variant;

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    deleteEmployee,
    initialState,
  );


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
      <form
        ref={formRef}
        action={formAction}
        className="space-y-2"
      >
        <input type="hidden" name="membershipId" value={membershipId} />

        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl border border-red-900 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
        >
          {isPending ? "Удаляем..." : "Удалить сотрудника"}
        </button>

        {state.error ? (
          <div className="text-xs text-red-300">{state.error}</div>
        ) : null}

        {state.success ? (
          <div className="text-xs text-emerald-300">{state.success}</div>
        ) : null}
      </form>

      <PlatformConfirmModal
        open={isConfirmOpen}
        tone="destructive"
        title="Удалить сотрудника?"
        description={`После подтверждения сотрудник «${employeeLabel}» будет удален из CMS. Если сотрудник уже подключился, доступ в систему будет закрыт.`}
        confirmLabel="Удалить сотрудника"
        pendingLabel="Удаляем..."
        isPending={isPending}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
