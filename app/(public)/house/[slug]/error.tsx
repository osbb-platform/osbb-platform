"use client";

import { useEffect } from "react";
import { PubEmptyState } from "@/src/shared/ui/public/PubEmptyState";
import { PubButton } from "@/src/shared/ui/public/PubButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicHouseError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Public house route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="px-4 py-8">
      <PubEmptyState
        tone="error"
        icon={<PubIcon name="alert" className="h-7 w-7" />}
        title="Сторінку тимчасово не вдалося завантажити"
        description={
          error.digest
            ? `Спробуйте ще раз. Код помилки для підтримки: ${error.digest}`
            : "Спробуйте оновити сторінку або поверніться пізніше."
        }
        action={
          <PubButton variant="primary" onClick={reset}>
            Спробувати знову
          </PubButton>
        }
      />
    </div>
  );
}
