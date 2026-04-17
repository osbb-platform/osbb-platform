"use client";

import { createHouseAnnouncementSection } from "@/src/modules/houses/actions/createHouseAnnouncementSection";

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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-200">
            Новое объявление
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Новое объявление создается как черновик в табе «На модерации».
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть форму"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
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
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Заголовок объявления
          </label>
          <input
            name="title"
            type="text"
            placeholder="Например: Отключение воды"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Тип объявления
          </label>
          <select
            name="level"
            defaultValue="info"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          >
            <option value="danger">Красный — важное</option>
            <option value="warning">Оранжевый — обратить внимание</option>
            <option value="info">Серый — обычное объявление</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Текст объявления
          </label>
          <textarea
            name="body"
            rows={6}
            placeholder="Введите текст объявления"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex min-h-16 items-center justify-center rounded-3xl bg-white px-10 py-5 text-2xl font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
