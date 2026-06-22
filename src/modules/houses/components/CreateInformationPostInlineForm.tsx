"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";
import type { ContentTemplateSlot } from "@/src/modules/houses/components/ContentTemplateSlotsPanel";

import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminInputClass,
  adminIconButtonClass,
  adminInsetSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

const INFORMATION_IMAGE_BUCKET = "house-information-images";
const MAX_COVER_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

type Props = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  templates?: ContentTemplateSlot[];
  templateSlotLimit?: number;
  onClose: () => void;
};

function getSafeCoverFileName(file: File) {
  const rawFileExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileExt = ["jpg", "jpeg", "png", "webp"].includes(rawFileExt) ? rawFileExt : "jpg";

  return `cover.${fileExt}`;
}

function getRandomStorageId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function findNextTemplateSlot(templates: ContentTemplateSlot[], slotLimit: number) {
  const usedSlots = new Set(templates.map((template) => template.slotIndex));

  for (let slotIndex = 1; slotIndex <= slotLimit; slotIndex += 1) {
    if (!usedSlots.has(slotIndex)) {
      return slotIndex;
    }
  }

  return null;
}

export function CreateInformationPostInlineForm({
  houseId,
  houseSlug,
  housePageId,
  templates = [],
  templateSlotLimit = 3,
  onClose,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [body, setBody] = useState("");
  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function uploadCoverImage(file: File) {
    if (!ALLOWED_COVER_IMAGE_TYPES.has(file.type)) {
      throw new Error("Обкладинка має бути JPG, PNG або WebP.");
    }

    if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      throw new Error("Обкладинка має бути не більшою за 15 МБ.");
    }

    const supabase = createSupabaseBrowserClient();
    const safeFileName = getSafeCoverFileName(file);
    const randomId = getRandomStorageId();
    const filePath = `${houseId}/${Date.now()}-${randomId}-${safeFileName}`;

    const { error } = await supabase.storage
      .from(INFORMATION_IMAGE_BUCKET)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

    if (error) {
      throw new Error(`Не вдалося завантажити обкладинку: ${error.message}`);
    }

    return {
      bucket: INFORMATION_IMAGE_BUCKET,
      path: filePath,
      originalName: file.name,
      mimeType: file.type || null,
      size: file.size,
    };
  }

  function buildCurrentFormData() {
    const formElement = formRef.current;

    if (!formElement) {
      throw new Error("Форму інформаційного матеріалу не знайдено.");
    }

    return new FormData(formElement);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    let coverImage: Awaited<ReturnType<typeof uploadCoverImage>> | null = null;

    try {
      const formData = buildCurrentFormData();
      coverImage = selectedCoverImage ? await uploadCoverImage(selectedCoverImage) : null;

      const result = await dispatch(
        {
          type: "information_posts.create",
          houseId,
          payload: {
            headline: String(formData.get("headline") ?? ""),
            category: String(formData.get("category") ?? INFORMATION_CATEGORIES[0]),
            body: String(formData.get("body") ?? ""),
            isPinned,
            coverImage,
          },
        },
        {
          onSuccess: () => onClose(),
          onError: setActionError,
        },
      );

      if (!result && coverImage) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage.from(coverImage.bucket).remove([coverImage.path]);
      }
    } catch (error) {
      if (coverImage) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage.from(coverImage.bucket).remove([coverImage.path]);
      }

      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося створити інформаційний матеріал.",
      );
    }
  }

  async function saveCurrentFormAsTemplate() {
    setActionError(null);
    setActionSuccess(null);

    const slotIndex = findNextTemplateSlot(templates, templateSlotLimit);

    if (!slotIndex) {
      setActionError(
        "Вільних слотів для шаблонів більше немає. Видаліть один із поточних шаблонів, щоб звільнити слот.",
      );
      return;
    }

    let coverImage: Awaited<ReturnType<typeof uploadCoverImage>> | null = null;

    try {
      const formData = buildCurrentFormData();
      const headline = String(formData.get("headline") ?? "").trim();
      const bodyValue = String(formData.get("body") ?? "").trim();
      const categoryValue = String(formData.get("category") ?? INFORMATION_CATEGORIES[0]);

      if (!headline) {
        setActionError("Вкажіть заголовок перед збереженням шаблону.");
        return;
      }

      if (!bodyValue) {
        setActionError("Вкажіть текст перед збереженням шаблону.");
        return;
      }

      setIsSavingTemplate(true);

      coverImage = selectedCoverImage ? await uploadCoverImage(selectedCoverImage) : null;

      const saved = await dispatch(
        {
          type: "templates.upsert",
          houseId,
          payload: {
            sectionKind: "information_post",
            slotIndex,
            name: headline,
            description: "",
            payload: {
              posts: [
                {
                  headline,
                  body: bodyValue,
                  category: categoryValue,
                  isPinned,
                  coverImage,
                },
              ],
            },
          },
        },
        {
          successMessage: "Шаблон інформаційного матеріалу збережено",
          onError: setActionError,
        },
      );

      if (!saved && coverImage) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage.from(coverImage.bucket).remove([coverImage.path]);
        return;
      }

      if (saved) {
        setActionSuccess("Шаблон збережено. Він доступний у всіх будинках.");
      }
    } catch (error) {
      if (coverImage) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage.from(coverImage.bucket).remove([coverImage.path]);
      }

      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти шаблон інформаційного матеріалу.",
      );
    } finally {
      setIsSavingTemplate(false);
    }
  }

  void houseSlug;
  void housePageId;

  const combinedError = actionError ?? lastError;
  const actionsDisabled = isPending || isSavingTemplate;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-[var(--cms-text)]">
            Нове повідомлення
          </div>
          <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
            Створюється як чернетка і публікується окремо
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={adminIconButtonClass}
          aria-label="Закрити форму створення повідомлення"
        >
          ×
        </button>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок
          </label>
          <input name="headline" className={adminInputClass} required />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Категорія
          </label>
          <select
            name="category"
            defaultValue={INFORMATION_CATEGORIES[0]}
            className={adminInputClass}
          >
            {INFORMATION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className={adminInsetSurfaceClass}>
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-muted)]">
              <div className="aspect-[16/9] w-full">
                {previewUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${previewUrl}")` }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--cms-text-muted)]">
                    Попередній перегляд
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-[var(--cms-text)]">
                Обкладинка
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={adminPrimaryButtonClass}
              >
                Обрати файл
              </button>

              <input
                ref={fileInputRef}
                name="coverImage"
                type="file"
                hidden
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedCoverImage(file);
                  setPreviewUrl(file ? URL.createObjectURL(file) : null);
                }}
              />
            </div>
          </div>
        </div>

        <label className={`${adminInsetSurfaceClass} flex items-start gap-3`}>
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(event) => setIsPinned(event.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-[var(--cms-text)]">
              Закріпити
            </div>
            <div className="text-xs text-[var(--cms-text-muted)]">
              Показувати вище за інші
            </div>
          </div>
        </label>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Текст
          </label>
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={512}
            rows={6}
            className={adminInputClass}
            required
          />
          <div className="text-xs text-[var(--cms-text-muted)]">
            {body.length}/512
          </div>
        </div>
      </div>

      {combinedError ? (
        <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {combinedError}
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="mt-4 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {actionSuccess}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={actionsDisabled}
            className={`${adminPrimaryButtonClass} disabled:opacity-60`}
          >
            {isPending ? "Створюємо..." : "Створити"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={actionsDisabled}
            className="text-sm text-[var(--cms-text-muted)] disabled:opacity-60"
          >
            Скасувати
          </button>
        </div>

        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() => void saveCurrentFormAsTemplate()}
          className={`${adminSecondaryButtonClass} disabled:opacity-60`}
        >
          {isSavingTemplate ? "Зберігаємо шаблон..." : "Запамʼятати як шаблон"}
        </button>
      </div>
    </form>
  );
}
