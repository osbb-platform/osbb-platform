"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";

import {
  adminPrimaryButtonClass,
  adminInputClass,
  adminIconButtonClass,
  adminInsetSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

const INFORMATION_IMAGE_BUCKET = "house-information-images";
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
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
  onClose: () => void;
};

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ._-]+/giu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function CreateInformationPostInlineForm({
  houseId,
  houseSlug,
  housePageId,
  onClose,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const [body, setBody] = useState("");
  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
      throw new Error("Обкладинка має бути не більшою за 5 МБ.");
    }

    const supabase = createSupabaseBrowserClient();
    const fileExt = file.name.split(".").pop() || "jpg";
    const safeFileName = sanitizeFileName(file.name) || `cover.${fileExt}`;
    const filePath = `${houseId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${safeFileName}`;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const coverImage = selectedCoverImage
        ? await uploadCoverImage(selectedCoverImage)
        : null;

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
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося створити інформаційний матеріал.",
      );
    }
  }

  void houseSlug;
  void housePageId;

  const combinedError = actionError ?? lastError;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
    >
      {/* HEADER */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-[var(--cms-text)]">
            Нове повідомлення
          </div>
          <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
            Створюється як чернетка і публікується окремо
          </div>
        </div>

        <button type="button" onClick={onClose} className={adminIconButtonClass} aria-label="Закрити форму створення повідомлення">
          ×
        </button>
      </div>

      <div className="grid gap-4">
        {/* TITLE */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок
          </label>
          <input
            name="headline"
            className={adminInputClass}
            required
          />
        </div>

        {/* CATEGORY */}
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

        {/* COVER */}
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
                  <div className="flex h-full items-center justify-center text-xs text-[var(--cms-text-muted)]">
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

        {/* PIN */}
        <label className={`${adminInsetSurfaceClass} flex items-start gap-3`}>
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
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

        {/* TEXT */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Текст
          </label>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={256}
            rows={6}
            className={adminInputClass}
            required
          />
          <div className="text-xs text-[var(--cms-text-muted)]">
            {body.length}/256
          </div>
        </div>
      </div>

      {combinedError ? (
        <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {combinedError}
        </div>
      ) : null}

      {/* ACTIONS */}
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={adminPrimaryButtonClass}
        >
          {isPending ? "Створюємо..." : "Створити"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--cms-text-muted)]"
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}
