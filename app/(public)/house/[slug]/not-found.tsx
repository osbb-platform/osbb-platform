"use client";

import { ErrorState } from "@/src/shared/ui/feedback/ErrorState";

export default function PublicHouseNotFound() {
  return (
    <div className="px-4 py-8">
      <ErrorState
        title="Сторінку не знайдено"
        description="Будинок або сторінка недоступні. Перевірте адресу або поверніться на головну."
        showHome
      />
    </div>
  );
}
