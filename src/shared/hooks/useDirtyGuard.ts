"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DeferredAction = () => void;

type UseDirtyGuardOptions = {
  isDirty: boolean;
};

export function useDirtyGuard({ isDirty }: UseDirtyGuardOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deferredActionRef = useRef<DeferredAction | null>(null);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const request = useCallback(
    (action: DeferredAction) => {
      if (!isDirty) {
        action();
        return;
      }

      deferredActionRef.current = action;
      setConfirmOpen(true);
    },
    [isDirty],
  );

  const cancel = useCallback(() => {
    deferredActionRef.current = null;
    setConfirmOpen(false);
  }, []);

  const discardAndContinue = useCallback(() => {
    const action = deferredActionRef.current;
    deferredActionRef.current = null;
    setConfirmOpen(false);
    action?.();
  }, []);

  return { confirmOpen, request, cancel, discardAndContinue };
}
