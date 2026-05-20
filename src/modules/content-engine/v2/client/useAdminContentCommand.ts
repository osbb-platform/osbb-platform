"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { dispatchAdminCommand } from "@/src/modules/content-engine/v2/dispatch";
import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";

type DispatchOptions = {
  /** Success message reserved for future toast integration. null = do not show toast. */
  successMessage?: string | null;
  /** Prefix reserved for future toast integration. Default: "Помилка". */
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
          resolve(null);
          return;
        }

        if (options.refreshOnSuccess !== false) {
          router.refresh();
        }

        options.onSuccess?.(result.data);
        resolve(result.data as T);
      });
    });
  }

  return { dispatch, isPending, lastError };
}
