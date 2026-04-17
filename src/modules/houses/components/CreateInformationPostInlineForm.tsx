"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createHouseInformationSection } from "@/src/modules/houses/actions/createHouseInformationSection";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";

const initialState = {
  error: null,
};

type Props = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  onClose: () => void;
};

export function CreateInformationPostInlineForm({
  houseId,
  houseSlug,
  housePageId,
  onClose,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createHouseInformationSection,
    initialState,
  );
  const [body, setBody] = useState("");
  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const hasSubmittedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!hasSubmittedRef.current) {
      return;
    }

    if (!isPending && state.error === null) {
      router.refresh();
      onClose();
      hasSubmittedRef.current = false;
    }
  }, [isPending, state.error, router, onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <form
      action={(formData) => {
        if (selectedCoverImage) {
          formData.set("coverImage", selectedCoverImage);
        }

        return formAction(formData);
      }}
      className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
    >
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="housePageId" value={housePageId ?? ""} />
      <input type="hidden" name="isPinned" value={isPinned ? "true" : "false"} />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">
            Новое информационное сообщение
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-400">
            Новое сообщение создается как черновик и затем публикуется отдельно.
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть форму"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
        >
          ×
        </button>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Заголовок
          </label>
          <input
            name="headline"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            placeholder="Введите заголовок"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Фильтр
          </label>
          <select
            name="category"
            defaultValue={INFORMATION_CATEGORIES[0]}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          >
            {INFORMATION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-4">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <div className="overflow-hidden rounded-[20px] border border-slate-800 bg-slate-900">
              <div className="aspect-[16/9] w-full">
                {previewUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${previewUrl}")` }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs leading-5 text-slate-500">
                    Предпросмотр появится после выбора фотографии
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">Обложка сообщения</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    Используется в карточке сообщения в разделе «Информация».
                  </div>
                </div>

                <div className="shrink-0">
                  <input
                    ref={fileInputRef}
                    name="coverImage"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;

                      if (previewUrl?.startsWith("blob:")) {
                        URL.revokeObjectURL(previewUrl);
                      }

                      setSelectedCoverImage(file);
                      setPreviewUrl(file ? URL.createObjectURL(file) : null);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Выбрать файл
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-1 text-xs leading-5 text-slate-500">
                <div>Рекомендуется: 1600×900 px</div>
                <div>Минимум: 1280×720 px</div>
                <div>Формат: JPG, PNG или WebP</div>
                <div>Размер файла: до 5 МБ</div>
                <div>Лучше загружать горизонтальную фотографию, где главный объект находится по центру кадра</div>
              </div>

              {selectedCoverImage ? (
                <div className="mt-3 text-xs text-slate-400">
                  {selectedCoverImage.name}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(event) => setIsPinned(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950"
          />
          <div>
            <div className="text-sm font-medium text-white">
              Закрепить наверху блога
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Закрепленные материалы показываются выше обычных публикаций.
            </div>
          </div>
        </label>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Текст сообщения
          </label>
          <textarea
            name="body"
            maxLength={256}
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            placeholder="Введите текст сообщения (до 256 символов)"
            required
          />
          <div className="mt-2 text-xs text-slate-500">{body.length}/256</div>
        </div>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            hasSubmittedRef.current = true;
          }}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Создаем..." : "Создать черновик"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
