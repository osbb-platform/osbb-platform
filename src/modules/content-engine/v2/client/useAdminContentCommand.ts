"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { dispatchAdminCommand } from "@/src/modules/content-engine/v2/dispatch";
import { useToast } from "@/src/shared/ui/toast/ToastProvider";
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
            title: options.errorPrefix ?? "Помилка",
            description: result.error,
          });
          resolve(null);
          return;
        }

        if (options.refreshOnSuccess !== false) {
          router.refresh();
        }

        options.onSuccess?.(result.data);

        if (options.successMessage !== null) {
          toast({
            tone: "success",
            title: options.successMessage ?? "Збережено",
          });
        }

        resolve(result.data as T);
      });
    });
  }

  return { dispatch, isPending, lastError };
}
