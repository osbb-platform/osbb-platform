"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { dispatchAdminCommand } from "@/src/modules/content-engine/v2/dispatch";
import { useToast } from "@/src/shared/ui/toast/ToastProvider";
import { errorMessages } from "@/src/modules/content-engine/v2/client/errorMessages";
import { buildLifecycleUndoCommand } from "@/src/modules/content-engine/v2/client/lifecycleUndo";
import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";

type DispatchOptions = {
  /** Success message for toast. null = do not show toast. */
  successMessage?: string | null;
  /** Error toast title. Default: "Помилка". */
  errorPrefix?: string;
  /** router.refresh() after success. Default: true. */
  refreshOnSuccess?: boolean;
  /** Callback after success. */
  onSuccess?: (data: unknown) => void;
  /** Callback after error. */
  onError?: (error: string) => void;
  /** Disable lifecycle Undo for inverse commands and exceptional flows. */
  enableUndo?: boolean;
};

export function useAdminContentCommand() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [lastError, setLastError] = useState<string | null>(null);

  function dispatch<T = unknown>(
    command: AdminCommand,
    options: DispatchOptions = {},
  ): Promise<T | null> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setLastError(null);

        const result = await dispatchAdminCommand(command);

        if (!result.ok) {
          setLastError(result.error);
          options.onError?.(result.error);
          toast({
            tone: "error",
            title:
              result.code === "STALE_CONTENT"
                ? "Дані застаріли"
                : (options.errorPrefix ?? "Помилка"),
            description: result.code
              ? (errorMessages[result.code] ?? result.error)
              : result.error,
            action:
              result.code === "STALE_CONTENT"
                ? {
                    label: "Оновити дані",
                    onClick: () => router.refresh(),
                  }
                : undefined,
          });
          resolve(null);
          return;
        }

        if (options.refreshOnSuccess !== false) {
          router.refresh();
        }

        options.onSuccess?.(result.data);

        if (options.successMessage !== null) {
          const undoCommand =
            options.enableUndo === false
              ? null
              : buildLifecycleUndoCommand(command, result.data);

          toast({
            tone: "success",
            title: options.successMessage ?? "Збережено",
            action: undoCommand
              ? {
                  label: "Скасувати",
                  onClick: () => {
                    void dispatch(undoCommand, {
                      successMessage: "Дію скасовано",
                      enableUndo: false,
                    });
                  },
                }
              : undefined,
          });
        }

        resolve(result.data as T);
      });
    });
  }

  return { dispatch, isPending, lastError };
}
