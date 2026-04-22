"use client";

import { createHouseAnnouncementSection } from "@/src/modules/houses/actions/createHouseAnnouncementSection";
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
  return (
    <div className={[adminInsetSurfaceClass, adminInsetPaddingClass].join(" ")}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--cms-text)]">
            Новое объявление
          </div>
          <div className={["mt-1", adminBodyClass].join(" ")}>
            Новое объявление создается как черновик в табе «На модерации».
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть форму"
            className={adminIconButtonClass}
          >
            ×
          </button>
        ) : null}
      </div>

      <form action={createHouseAnnouncementSection} className="grid gap-4">
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="housePageId" value={housePageId} />

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок объявления
          </label>
          <input
            name="title"
            type="text"
            placeholder="Например: Отключение воды"
            className={adminInputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Тип объявления
          </label>
          <select
            name="level"
            defaultValue="info"
            className={adminInputClass}
          >
            <option value="danger">Красный — важное</option>
            <option value="warning">Оранжевый — обратить внимание</option>
            <option value="info">Салатовый — обычное объявление</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Текст объявления
          </label>
          <textarea
            name="body"
            rows={6}
            placeholder="Введите текст объявления"
            className={adminInputClass}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className={[adminPrimaryButtonClass, "min-h-16 rounded-3xl px-10 py-5 text-2xl"].join(" ")}
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
