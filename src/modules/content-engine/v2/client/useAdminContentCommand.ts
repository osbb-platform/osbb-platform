"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  onError?: (error: string, code?: string) => void;
  /** Disable lifecycle Undo for inverse commands and exceptional flows. */
  enableUndo?: boolean;
};

export function useAdminContentCommand() {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const isPending = pendingCount > 0;

  async function dispatch<T = unknown>(
    command: AdminCommand,
    options: DispatchOptions = {},
  ): Promise<T | null> {
    setPendingCount((count) => count + 1);
    setLastError(null);

    try {
      const result = await dispatchAdminCommand(command);

      if (!result.ok) {
        setLastError(result.error);
        options.onError?.(result.error, result.code);

        // STALE_CONTENT and INTERNAL can arrive after the server has already
        // mutated authoritative data. Refresh immediately so server props,
        // including lock_version, replace any stale client snapshot.
        // Never blind-retry the same command payload here.
        if (
          result.code === "STALE_CONTENT" ||
          result.code === "INTERNAL"
        ) {
          router.refresh();
        }

        toast({
          tone: "error",
          title:
            result.code === "STALE_CONTENT"
              ? "Дані застаріли"
              : (options.errorPrefix ?? "Помилка"),
          description: result.code
            ? (errorMessages[result.code] ?? result.error)
            : result.error,
          action: undefined,
        });
        return null;
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

      return result.data as T;
    } catch {
      const message = "Не вдалося виконати дію. Спробуйте ще раз.";
      setLastError(message);
      options.onError?.(message, "INTERNAL");
      toast({
        tone: "error",
        title: options.errorPrefix ?? "Помилка",
        description: errorMessages.INTERNAL ?? message,
        action: undefined,
      });
      return null;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }

  return { dispatch, isPending, lastError };
}
