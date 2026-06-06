"use client";

import { useEffect } from "react";
import { ErrorState } from "@/src/shared/ui/feedback/ErrorState";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Public route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="px-4 py-8">
      <ErrorState
        title="Сторінку тимчасово не вдалося завантажити"
        description={
          error.digest
            ? `Спробуйте ще раз. Код помилки для підтримки: ${error.digest}`
            : "Спробуйте оновити сторінку або поверніться пізніше."
        }
        onRetry={reset}
        showHome
      />
    </div>
  );
}
