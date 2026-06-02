"use client";

import { FormEvent, startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createHouse } from "@/src/modules/houses/actions/createHouse";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { slugify } from "@/src/shared/utils/slug/slugify";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";
import { ACCEPTED_IMAGE_TYPES, validateSingleImageFile } from "@/src/shared/utils/validators/imageUpload";

type CreateHouseFormProps = {
  districts: Array<{
    id: string;
    name: string;
    slug?: string;
  }>;
  managementCompanies: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

const initialState = {
  error: null,
};

const DEFAULT_DISTRICT_SLUG = "bez-rayona";
const DEFAULT_COMPANY_SLUG = "tov-bukhhalter-onlain";
const HOUSE_COVER_BUCKET = "house-cover-images";
const HOUSE_COVER_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function sanitizeUploadFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ._-]+/giu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

async function uploadHouseCoverImage(file: File) {
  const validation = validateSingleImageFile(file, {
    label: "Фото будинку",
    maxSizeBytes: HOUSE_COVER_MAX_SIZE_BYTES,
    maxSizeLabel: "5 МБ",
  });

  if (!validation.isValid) {
    throw new Error(validation.error ?? "Фото будинку має бути JPG, PNG або WebP і не більше 5 МБ.");
  }

  const supabase = createSupabaseBrowserClient();
  const fileExt = file.name.split(".").pop() || "jpg";
  const safeFileName = sanitizeUploadFileName(file.name) || `cover.${fileExt}`;
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const filePath = `pending/${Date.now()}-${randomId}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(HOUSE_COVER_BUCKET)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(`Не вдалося завантажити фото будинку: ${error.message}`);
  }

  return {
    path: filePath,
    originalName: file.name,
  };
}

export function CreateHouseForm({
  districts,
  managementCompanies,
}: CreateHouseFormProps) {
  const [state, formAction, isPending] = useActionState(
    createHouse,
    initialState,
  );
  const [name, setName] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
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

  const defaultCompanyId =
    managementCompanies.find(
      (company) => company.slug === DEFAULT_COMPANY_SLUG,
    )?.id ?? "";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);

    try {
      setIsUploadingCover(true);

      const formData = new FormData(event.currentTarget);
      formData.delete("coverImage");

      if (selectedImage) {
        const uploadedCover = await uploadHouseCoverImage(selectedImage);
        formData.set("uploadedImagePath", uploadedCover.path);
        formData.set("uploadedImageName", uploadedCover.originalName);
      }

      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити фото будинку.",
      );
    } finally {
      setIsUploadingCover(false);
    }
  }

  const combinedError = actionError ?? state.error;
  const isSubmitting = isPending || isUploadingCover;

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 md:grid-cols-2"
      aria-busy={isSubmitting}
    >
      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Назва будинку
        </label>
        <input
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Назва будинку"
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Системний slug
        </label>
        <input
          type="text"
          value={slugPreview}
          readOnly
          className="w-full rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-[var(--cms-text-muted)] outline-none"
        />
        <div className="mt-2 text-xs text-[var(--cms-text-soft)]">
          Slug формується автоматично за назвою будинку та далі не редагується.
        </div>
      </div>

      <div className="md:col-span-2">
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Адреса
        </label>
        <input
          name="address"
          type="text"
          placeholder="м. Запоріжжя, ..."
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          ОСББ
        </label>
        <input
          name="osbbName"
          type="text"
          placeholder="ОСББ ..."
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Район
        </label>
        <select
          name="districtId"
          required
          className={adminInputClass}
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
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Керуюча компанія
        </label>
        <select
          name="managementCompanyId"
          required
          defaultValue={defaultCompanyId}
          className={adminInputClass}
        >
          <option value="" disabled>
            Оберіть керуючу компанію
          </option>

          {managementCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Короткий опис
        </label>
        <input
          name="shortDescription"
          type="text"
          placeholder="Короткий опис"
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Публічний опис
        </label>
        <input
          name="publicDescription"
          type="text"
          placeholder="Публічний опис"
          className={adminInputClass}
        />
      </div>

      <div className={`md:col-span-2 ${adminSurfaceClass} p-4`}>
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <div className="overflow-hidden rounded-[20px] border border-[var(--cms-border)] bg-[var(--cms-surface)]">
            <div className="aspect-[16/9] w-full">
              {previewUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${previewUrl}")` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs leading-5 text-[var(--cms-text-soft)]">
                  Попередній перегляд з’явиться після вибору фотографії
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--cms-text)]">
                  Фото будинку
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--cms-text-muted)]">
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

                    if (file) {
                      const validation = validateSingleImageFile(file, {
                        label: "Фото будинку",
                        maxSizeBytes: HOUSE_COVER_MAX_SIZE_BYTES,
                        maxSizeLabel: "5 МБ",
                      });

                      if (!validation.isValid) {
                        setActionError(validation.error);
                        setSelectedImage(null);
                        setPreviewUrl(null);
                        event.target.value = "";
                        return;
                      }
                    }

                    setActionError(null);
                    setSelectedImage(file);
                    setPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] px-4 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                >
                  Обрати файл
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-1 text-xs leading-5 text-[var(--cms-text-soft)]">
              <div>Рекомендовано: 1600×900 px</div>
              <div>Мінімум: 1280×720 px</div>
              <div>Формат: JPG, PNG або WebP</div>
              <div>Розмір файлу: до 5 МБ</div>
              <div>
                Краще завантажувати горизонтальну фотографію, де будинок
                знаходиться по центру кадру
              </div>
            </div>

            {selectedImage ? (
              <div className="mt-3 text-xs text-[var(--cms-text-muted)]">
                {selectedImage.name} · {formatFileSize(selectedImage.size)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {combinedError ? (
        <div className="md:col-span-2 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {combinedError}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          className={`${adminPrimaryButtonClass} disabled:opacity-60`}
        >
          {isUploadingCover ? "Завантажуємо фото..." : isPending ? "Створюємо..." : "Створити будинок"}
        </button>
      </div>
    </form>
  );
}
