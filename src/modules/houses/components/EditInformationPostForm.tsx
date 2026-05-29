"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveHouseInformationSection } from "@/src/modules/houses/actions/archiveHouseInformationSection";
import { deleteHouseSection } from "@/src/modules/houses/actions/deleteHouseSection";
import { publishHouseInformationSection } from "@/src/modules/houses/actions/publishHouseInformationSection";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";

import {
  adminPrimaryButtonClass,
  adminSuccessButtonClass,
  adminDangerButtonClass,
  adminWarningButtonClass,
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

  const [isPinned, setIsPinned] = useState(
    Boolean(section.content.isPinned),
  );

  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const [uploadedCoverImagePath, setUploadedCoverImagePath] = useState("");
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    typeof section.content.coverImageUrl === "string"
      ? section.content.coverImageUrl
      : null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!hasSubmittedRef.current) return;

    if (!isPending && state.error === null) {
      router.refresh();
      onClose();
      hasSubmittedRef.current = false;
    }
  }, [isPending, state.error, router, onClose]);

  return (
    <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <form
        id="information-post-edit-form"
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
        className="grid gap-4"
      >
        <input type="hidden" name="sectionId" value={section.id} />
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="kind" value="rich_text" />
        <input type="hidden" name="title" value={section.title} />
        <input type="hidden" name="isPinned" value={isPinned ? "true" : "false"} />
        <input type="hidden" name="status" value={section.status} />
        <input type="hidden" name="coverImagePath" value={uploadedCoverImagePath} />

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[var(--cms-text)]">
              Редагування повідомлення
            </div>
            <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
              Можна зберегти, опублікувати, архівувати або видалити.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={adminIconButtonClass}
          >
            ×
          </button>
        </div>

        {/* INPUTS */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок
          </label>
          <input
            name="headline"
            defaultValue={section.title}
            className={adminInputClass}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Категорія
          </label>
          <select name="category" defaultValue={category} className={adminInputClass}>
            {INFORMATION_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
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
                hidden
                accept={ACCEPTED_IMAGE_TYPES}
                onChange={async (event) => {
                  const file = event.target.files?.[0] ?? null;

                  if (previewUrl?.startsWith("blob:")) {
                    URL.revokeObjectURL(previewUrl);
                  }

                  setUploadedCoverImagePath("");

                  if (!file) {
                    setSelectedCoverImage(null);
                    setCoverImageError(null);
                    setPreviewUrl(
                      typeof section.content.coverImageUrl === "string"
                        ? section.content.coverImageUrl
                        : null,
                    );
                    return;
                  }

                  if (!ACCEPTED_IMAGE_TYPES.split(",").includes(file.type)) {
                    event.target.value = "";
                    setSelectedCoverImage(null);
                    setCoverImageError("Для обкладинки дозволені лише JPG, PNG або WebP.");
                    setPreviewUrl(
                      typeof section.content.coverImageUrl === "string"
                        ? section.content.coverImageUrl
                        : null,
                    );
                    return;
                  }

                  if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
                    event.target.value = "";
                    setSelectedCoverImage(null);
                    setCoverImageError("Обкладинка повідомлення має бути не більшою за 15 МБ.");
                    setPreviewUrl(
                      typeof section.content.coverImageUrl === "string"
                        ? section.content.coverImageUrl
                        : null,
                    );
                    return;
                  }

                  const nextPreviewUrl = URL.createObjectURL(file);
                  setSelectedCoverImage(file);
                  setPreviewUrl(nextPreviewUrl);
                  setCoverImageError(null);
                  setIsUploadingCoverImage(true);

                  const uploadPath = buildInformationCoverImagePath({
                    houseId,
                    sectionId: section.id,
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
                    setPreviewUrl(
                      typeof section.content.coverImageUrl === "string"
                        ? section.content.coverImageUrl
                        : null,
                    );
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
              Закріпити вгорі
            </div>
            <div className="text-xs text-[var(--cms-text-muted)]">
              Закріплені повідомлення відображаються першими
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
            maxLength={512}
            rows={6}
            onChange={(e) => setBody(e.target.value)}
            className={adminInputClass}
            required
          />
          <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
            {body.length}/512
          </div>
        </div>

        {state.error && (
          <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {state.error}
          </div>
        )}
      </form>

      {/* ACTIONS */}
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="submit"
            form="information-post-edit-form"
            disabled={isPending || isUploadingCoverImage}
            onClick={() => (hasSubmittedRef.current = true)}
            className={`${adminPrimaryButtonClass} disabled:opacity-60`}
          >
            {isUploadingCoverImage ? "Завантажуємо обкладинку..." : isPending ? "Зберігаємо..." : "Зберегти"}
          </button>

          {isDraft && (
            <form action={deleteDraftAction}>
              <input type="hidden" name="sectionId" value={section.id} />
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <button className={adminDangerButtonClass}>
                Видалити
              </button>
            </form>
          )}
        </div>

        <div className="flex gap-3">
          {isDraft ? (
            <form action={publishHouseInformationSection}>
              <input type="hidden" name="sectionId" value={section.id} />
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <button className={adminSuccessButtonClass}>
                Підтвердити
              </button>
            </form>
          ) : (
            <form action={archiveHouseInformationSection}>
              <input type="hidden" name="sectionId" value={section.id} />
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <button className={adminWarningButtonClass}>
                Архівувати
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
