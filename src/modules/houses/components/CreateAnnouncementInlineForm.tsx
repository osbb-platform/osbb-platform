"use client";

import { FormEvent } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import {
  adminBodyClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetPaddingClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type CreateAnnouncementInlineFormProps = {
  houseId: string;
  houseSlug: string;
  housePageId: string;
  onClose?: () => void;
};

export function CreateAnnouncementInlineForm({
  houseId,
  houseSlug,
  housePageId,
  onClose,
}: CreateAnnouncementInlineFormProps) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await dispatch(
      {
        type: "announcements.create",
        houseId,
        payload: {
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
          level: String(formData.get("level") ?? "info"),
        },
      },
      {
        onSuccess: () => onClose?.(),
      },
    );
  }

  void houseSlug;
  void housePageId;

  return (
    <div className={[adminInsetSurfaceClass, adminInsetPaddingClass].join(" ")}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--cms-text)]">
            Нове оголошення
          </div>
          <div className={["mt-1", adminBodyClass].join(" ")}>
            Нове оголошення створюється як чернетка у вкладці «Чернетки».
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити форму"
            className={adminIconButtonClass}
          >
            ×
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок оголошення
          </label>
          <input
            name="title"
            type="text"
            placeholder="Наприклад: Відключення води"
            className={adminInputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Тип оголошення
          </label>
          <select
            name="level"
            defaultValue="info"
            className={adminInputClass}
          >
            <option value="danger">Червоний — важливе</option>
            <option value="warning">Помаранчевий — звернути увагу</option>
            <option value="info">Салатовий — звичайне оголошення</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Текст оголошення
          </label>
          <textarea
            name="body"
            rows={6}
            placeholder="Введіть текст оголошення"
            className={adminInputClass}
          />
        </div>

        {lastError ? (
          <p role="alert" className="text-sm text-[var(--cms-danger-text)]">
            {lastError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className={[adminPrimaryButtonClass, "min-h-16 rounded-[var(--r-xl)] px-10 py-5 text-2xl disabled:opacity-60"].join(" ")}
          >
            {isPending ? "Зберігаємо..." : "Зберегти"}
          </button>
        </div>
      </form>
    </div>
  );
}
