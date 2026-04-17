"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveHouseInformationSection } from "@/src/modules/houses/actions/archiveHouseInformationSection";
import { deleteHouseSection } from "@/src/modules/houses/actions/deleteHouseSection";
import { publishHouseInformationSection } from "@/src/modules/houses/actions/publishHouseInformationSection";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";

const initialState = {
  error: null,
};

type Props = {
  houseId: string;
  houseSlug: string;
  section: {
    id: string;
    title: string;
    status: "draft" | "in_review" | "published" | "archived";
    content: Record<string, unknown>;
  };
  onClose: () => void;
};

export function EditInformationPostForm({
  houseId,
  houseSlug,
  section,
  onClose,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  async function deleteDraftAction(formData: FormData) {
    await deleteHouseSection(formData);
  }

  const [body, setBody] = useState(
    typeof section.content.body === "string" ? section.content.body : "",
  );
  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    typeof section.content.coverImageUrl === "string"
      ? section.content.coverImageUrl
      : null,
  );
  const coverImageUrl =
    typeof section.content.coverImageUrl === "string"
      ? section.content.coverImageUrl
      : "";
  const [isPinned, setIsPinned] = useState(
    Boolean(section.content.isPinned),
  );

  const category = useMemo(
    () =>
      typeof section.content.category === "string"
        ? section.content.category
        : INFORMATION_CATEGORIES[0],
    [section.content.category],
  );

  const isDraft = section.status !== "published";
  const hasSubmittedRef = useRef(false);

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
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <form
        id="information-post-edit-form"
        action={(formData) => {
          if (selectedCoverImage) {
            formData.set("coverImage", selectedCoverImage);
          }

          return formAction(formData);
        }}
      >
        <input type="hidden" name="sectionId" value={section.id} />
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="kind" value="rich_text" />
        <input type="hidden" name="title" value={section.title} />
        <input type="hidden" name="isPinned" value={isPinned ? "true" : "false"} />
        <input type="hidden" name="status" value={section.status} />

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">
              Редактирование сообщения
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              После редактирования можно сохранить, опубликовать, архивировать
              или удалить черновик.
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
              defaultValue={section.title}
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
              defaultValue={category}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            >
              {INFORMATION_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
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

                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                    {previewUrl ? "Заменить фото" : "Выбрать файл"}
                    <input
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
                        setPreviewUrl(
                          file
                            ? URL.createObjectURL(file)
                            : (coverImageUrl || null)
                        );
                      }}
                    />
                  </label>
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
                ) : coverImageUrl ? (
                  <div className="mt-3 text-xs text-slate-500">
                    Текущая обложка сохранится, если новый файл не выбран.
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
                Закрепленные публикации будут отображаться выше обычных.
              </div>
            </div>
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Текст сообщения
            </label>
            <textarea
              name="body"
              value={body}
              maxLength={256}
              rows={6}
              onChange={(event) => setBody(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              placeholder="Введите текст сообщения (до 256 символов)"
              required
            />
            <div className="mt-2 text-xs text-slate-500">
              {body.length}/256
            </div>
          </div>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        ) : null}

      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            form="information-post-edit-form"
            disabled={isPending}
            onClick={() => {
              hasSubmittedRef.current = true;
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Сохраняем..." : "Сохранить"}
          </button>

          {isDraft ? (
            <form action={deleteDraftAction}>
              <input type="hidden" name="sectionId" value={section.id} />
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
              >
                Удалить
              </button>
            </form>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {isDraft ? (
            <form action={publishHouseInformationSection}>
              <input type="hidden" name="sectionId" value={section.id} />
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-800 bg-emerald-950/30 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-950/50"
              >
                Подтвердить
              </button>
            </form>
          ) : (
            <form action={archiveHouseInformationSection}>
              <input type="hidden" name="sectionId" value={section.id} />
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-amber-800 bg-amber-950/30 px-5 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-950/50"
              >
                Архивировать
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
