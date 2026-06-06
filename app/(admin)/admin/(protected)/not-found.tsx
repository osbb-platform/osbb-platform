"use client";

import { ErrorState } from "@/src/shared/ui/feedback/ErrorState";

export default function AdminNotFound() {
  return (
    <div className="p-6">
      <ErrorState
        title="Сторінку не знайдено"
        description="Сутність або розділ недоступні. Перевірте адресу або поверніться на головну."
        showHome
      />
    </div>
  );
}
