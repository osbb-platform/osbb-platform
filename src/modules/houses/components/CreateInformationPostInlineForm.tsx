"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createHouseInformationSection } from "@/src/modules/houses/actions/createHouseInformationSection";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";

import {
  adminPrimaryButtonClass,
  adminInputClass,
  adminIconButtonClass,
  adminInsetSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

const initialState = { error: null };

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const MAX_COVER_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const INFORMATION_IMAGES_BUCKET = "house-information-images";

function sanitizeCoverFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return normalized || "information-cover-image";
}

function buildInformationCoverImagePath(params: {
  houseId: string;
  sectionId: string;
  file: File;
}) {
  const safeFileName = sanitizeCoverFileName(params.file.name);
  return `${params.houseId}/${params.sectionId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${safeFileName}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

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
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const [uploadedCoverImagePath, setUploadedCoverImagePath] = useState("");
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const hasSubmittedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!hasSubmittedRef.current) return;

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
      action={formAction}
      onSubmit={(event) => {
        if (isUploadingCoverImage) {
          event.preventDefault();
          setCoverImageError("Дочекайтеся завершення завантаження обкладинки.");
          return;
        }

        if (selectedCoverImage && !uploadedCoverImagePath) {
          event.preventDefault();
          setCoverImageError("Обкладинка ще не завантажена. Оберіть файл повторно.");
        }
      }}
      className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
    >
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="housePageId" value={housePageId ?? ""} />
      <input type="hidden" name="isPinned" value={isPinned ? "true" : "false"} />
      <input type="hidden" name="coverImagePath" value={uploadedCoverImagePath} />

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

        <button type="button" onClick={onClose} className={adminIconButtonClass}>
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

              {coverImageError ? (
                <div className="mt-3 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-xs text-[var(--cms-danger-text)]">
                  {coverImageError}
                </div>
              ) : null}

              {selectedCoverImage ? (
                <div className="mt-3 text-xs text-[var(--cms-text-muted)]">
                  {selectedCoverImage.name} · {formatFileSize(selectedCoverImage.size)}
                  {isUploadingCoverImage ? " · Завантажуємо..." : uploadedCoverImagePath ? " · Завантажено" : ""}
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0] ?? null;

                  if (previewUrl?.startsWith("blob:")) {
                    URL.revokeObjectURL(previewUrl);
                  }

                  setUploadedCoverImagePath("");

                  if (!file) {
                    setSelectedCoverImage(null);
                    setCoverImageError(null);
                    setPreviewUrl(null);
                    return;
                  }

                  if (!ACCEPTED_IMAGE_TYPES.split(",").includes(file.type)) {
                    event.target.value = "";
                    setSelectedCoverImage(null);
                    setCoverImageError("Для обкладинки дозволені лише JPG, PNG або WebP.");
                    setPreviewUrl(null);
                    return;
                  }

                  if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
                    event.target.value = "";
                    setSelectedCoverImage(null);
                    setCoverImageError("Обкладинка повідомлення має бути не більшою за 15 МБ.");
                    setPreviewUrl(null);
                    return;
                  }

                  const nextPreviewUrl = URL.createObjectURL(file);
                  setSelectedCoverImage(file);
                  setPreviewUrl(nextPreviewUrl);
                  setCoverImageError(null);
                  setIsUploadingCoverImage(true);

                  const uploadPath = buildInformationCoverImagePath({
                    houseId,
                    sectionId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    file,
                  });
                  const supabase = createSupabaseBrowserClient();
                  const { error } = await supabase.storage
                    .from(INFORMATION_IMAGES_BUCKET)
                    .upload(uploadPath, file, {
                      upsert: false,
                      contentType: file.type || undefined,
                    });

                  setIsUploadingCoverImage(false);

                  if (error) {
                    event.target.value = "";
                    setSelectedCoverImage(null);
                    setUploadedCoverImagePath("");
                    setCoverImageError(`Не вдалося завантажити обкладинку: ${error.message}`);
                    setPreviewUrl(null);
                    URL.revokeObjectURL(nextPreviewUrl);
                    return;
                  }

                  setUploadedCoverImagePath(uploadPath);
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

      {state.error && (
        <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      )}

      {/* ACTIONS */}
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={isPending || isUploadingCoverImage}
          onClick={() => (hasSubmittedRef.current = true)}
          className={`${adminPrimaryButtonClass} disabled:opacity-60`}
        >
          {isUploadingCoverImage ? "Завантажуємо обкладинку..." : isPending ? "Створюємо..." : "Створити"}
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
