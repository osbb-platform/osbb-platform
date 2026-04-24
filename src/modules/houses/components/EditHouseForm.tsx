"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateHouse } from "@/src/modules/houses/actions/updateHouse";
import {
  adminInputClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type EditHouseFormProps = {
  house: {
    id: string;
    name: string;
    slug: string;
    address: string;
    osbb_name: string | null;
    short_description: string | null;
    public_description: string | null;
    cover_image_path: string | null;
    cover_image_url?: string | null;
    is_active: boolean;
    district: {
      id: string;
      name: string;
      slug?: string;
    } | null;
    management_company_id: string | null;
  };
  districts: Array<{
    id: string;
    name: string;
    slug?: string;
  }>;
  managementCompanies: Array<{
    id: string;
    name: string;
    slug?: string;
  }>;
  onSuccess?: () => void;
  formId?: string;
  onPendingChange?: (isPending: boolean) => void;
};

const initialState = {
  error: null,
  successMessage: null,
};

const DEFAULT_DISTRICT_SLUG = "bez-rayona";
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";


export function EditHouseForm({
  house,
  districts,
  managementCompanies,
  onSuccess,
  formId,
  onPendingChange,
}: EditHouseFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateHouse,
    initialState,
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    house.cover_image_url ?? null,
  );
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (state.successMessage) {
      startTransition(() => {
        router.refresh();
        onSuccess?.();
      });
    }
  }, [onSuccess, router, state.successMessage]);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const syncPreviewToCurrentImage = () => {
    setPreviewUrl(removeCoverImage ? null : (house.cover_image_url ?? null));
  };

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <form id={formId} action={formAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={house.id} />
      <input
        type="hidden"
        name="removeCoverImage"
        value={removeCoverImage ? "true" : "false"}
      />

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Назва будинку
        </label>
        <input
          name="name"
          type="text"
          defaultValue={house.name}
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Системний slug
        </label>
        <input
          type="text"
          value={house.slug}
          readOnly
          className="w-full rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-[var(--cms-text-muted)] outline-none"
        />
        <div className="mt-2 text-xs text-[var(--cms-text-soft)]">
          Slug будинку вже використовується для сайту будинку та поки не редагується.
        </div>
      </div>

      <div className="md:col-span-2">
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Адреса
        </label>
        <input
          name="address"
          type="text"
          defaultValue={house.address}
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
          defaultValue={house.osbb_name ?? ""}
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
          defaultValue={house.district?.id ?? ""}
          className={adminInputClass}
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
          defaultValue={house.management_company_id ?? ""}
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
          defaultValue={house.short_description ?? ""}
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
          defaultValue={house.public_description ?? ""}
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
                  Зараз використовується зображення за замовчуванням
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--cms-text)]">Фото будинку</div>
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

                    if (previewUrl?.startsWith("blob:")) {
                      URL.revokeObjectURL(previewUrl);
                    }

                    setSelectedImage(file);

                    if (file) {
                      setRemoveCoverImage(false);
                      setPreviewUrl(URL.createObjectURL(file));
                    } else {
                      syncPreviewToCurrentImage();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] px-4 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                >
                  {previewUrl ? "Замінити фото" : "Обрати файл"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-1 text-xs leading-5 text-[var(--cms-text-soft)]">
              <div>Рекомендовано: 1600×900 px</div>
              <div>Мінімум: 1280×720 px</div>
              <div>Формат: JPG, PNG або WebP</div>
              <div>Розмір файлу: до 5 МБ</div>
              <div>Краще завантажувати горизонтальну фотографію, де будинок знаходиться по центру кадру</div>
            </div>

            {selectedImage ? (
              <div className="mt-3 text-xs text-[var(--cms-text-muted)]">
                Обрано новий файл
              </div>
            ) : null}

            <label className="mt-3 flex items-start gap-3 text-xs leading-5 text-[var(--cms-text-muted)]">
              <input
                type="checkbox"
                checked={removeCoverImage}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setRemoveCoverImage(checked);

                  if (checked) {
                    if (previewUrl?.startsWith("blob:")) {
                      URL.revokeObjectURL(previewUrl);
                    }

                    setSelectedImage(null);
                    setPreviewUrl(null);
                  } else {
                    syncPreviewToCurrentImage();
                  }
                }}
                className="mt-0.5 h-4 w-4"
              />
              <span>Видалити поточне фото та використовувати зображення за замовчуванням</span>
            </label>
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="md:col-span-2 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      {state.successMessage ? (
        <div className="md:col-span-2 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {state.successMessage}
        </div>
      ) : null}

    </form>
  );
}
