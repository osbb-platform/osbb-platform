"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createHouse } from "@/src/modules/houses/actions/createHouse";
import { slugify } from "@/src/shared/utils/slug/slugify";

type CreateHouseFormProps = {
  districts: Array<{
    id: string;
    name: string;
    slug?: string;
  }>;
};

const initialState = {
  error: null,
};

const DEFAULT_DISTRICT_SLUG = "bez-rayona";
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function CreateHouseForm({ districts }: CreateHouseFormProps) {
  const [state, formAction, isPending] = useActionState(
    createHouse,
    initialState,
  );
  const [name, setName] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const slugPreview = useMemo(() => {
    const generated = slugify(name);
    return generated || "slug-bude-stvoreno-avtomatychno";
  }, [name]);

  const orderedDistricts = useMemo(() => {
    const defaultDistrict = districts.find(
      (district) => district.slug === DEFAULT_DISTRICT_SLUG,
    );
    const regularDistricts = districts.filter(
      (district) => district.slug !== DEFAULT_DISTRICT_SLUG,
    );

    return defaultDistrict
      ? [defaultDistrict, ...regularDistricts]
      : regularDistricts;
  }, [districts]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Назва будинку
        </label>
        <input
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Назва будинку"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Системний slug
        </label>
        <input
          type="text"
          value={slugPreview}
          readOnly
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-400 outline-none"
        />
        <div className="mt-2 text-xs text-slate-500">
          Slug формується автоматично за назвою будинку та далі не редагується.
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Адреса
        </label>
        <input
          name="address"
          type="text"
          placeholder="м. Запоріжжя, ..."
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          ОСББ
        </label>
        <input
          name="osbbName"
          type="text"
          placeholder="ОСББ ..."
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Район
        </label>
        <select
          name="districtId"
          required
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          defaultValue=""
        >
          <option value="" disabled>
            Оберіть район
          </option>
          {orderedDistricts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Короткий опис
        </label>
        <input
          name="shortDescription"
          type="text"
          placeholder="Короткий опис"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Публічний опис
        </label>
        <input
          name="publicDescription"
          type="text"
          placeholder="Публічний опис"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="md:col-span-2 rounded-[24px] border border-slate-800 bg-slate-950/60 p-4">
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
                  Попередній перегляд з’явиться після вибору фотографії
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">Фото будинку</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  Використовується на сторінці входу до кабінету будинку.
                </div>
              </div>

              <div className="shrink-0">
                <input
                  ref={fileInputRef}
                  name="coverImage"
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }

                    setSelectedImage(file);
                    setPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Обрати файл
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-1 text-xs leading-5 text-slate-500">
              <div>Рекомендовано: 1600×900 px</div>
              <div>Мінімум: 1280×720 px</div>
              <div>Формат: JPG, PNG або WebP</div>
              <div>Розмір файлу: до 5 МБ</div>
              <div>Краще завантажувати горизонтальну фотографію, де будинок знаходиться по центру кадру</div>
            </div>

            {selectedImage ? (
              <div className="mt-3 text-xs text-slate-400">
                {selectedImage.name} · {formatFileSize(selectedImage.size)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="md:col-span-2 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {isPending ? "Створюємо..." : "Створити будинок"}
        </button>
      </div>
    </form>
  );
}
