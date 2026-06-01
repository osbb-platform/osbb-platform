"use client";

import { useEffect } from "react";
import { ErrorState } from "@/src/shared/ui/feedback/ErrorState";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminProtectedError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Admin protected route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="p-6">
      <ErrorState
        title="Не вдалося завантажити розділ"
        description={
          error.digest
            ? `Спробуйте ще раз. Код помилки для підтримки: ${error.digest}`
            : "Спробуйте ще раз або поверніться пізніше."
        }
        onRetry={reset}
      />
    </div>
  );
}
