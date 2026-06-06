"use client";

import { useEffect } from "react";
import { ErrorState } from "@/src/shared/ui/feedback/ErrorState";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminHouseError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Admin house route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="p-6">
      <ErrorState
        title="Не вдалося завантажити сторінку будинку"
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
