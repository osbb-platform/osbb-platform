"use client";

import type { ReactNode } from "react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";

import {
  adminButtonClasses,
  adminInputClass,
  adminInsetSurfaceClass,
  adminIconButtonClasses,
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
  section: {
    id: string;
    title: string;
    status: "draft" | "published" | "archived";
    content: Record<string, unknown>;
  };
  headerActions?: ReactNode;
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

function getLockVersion(section: Props["section"]) {
  return typeof section.content.lockVersion === "number"
    ? section.content.lockVersion
    : 1;
}


export function EditInformationPostForm({
  headerActions,
  houseId,
  houseSlug,
  section,
  onClose,
}: Props) {
  const { dispatch, isPending } = useAdminContentCommand();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [body, setBody] = useState(
    typeof section.content.body === "string" ? section.content.body : "",
  );
  const [isPinned, setIsPinned] = useState(Boolean(section.content.isPinned));
  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    typeof section.content.coverImageUrl === "string"
      ? section.content.coverImageUrl
      : null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "publish" | "archive" | "delete" | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<
    "publish" | "archive" | "delete" | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const category = useMemo(
    () =>
      typeof section.content.category === "string"
        ? section.content.category
        : INFORMATION_CATEGORIES[0],
    [section.content.category],
  );

  const isDraft = section.status === "draft";
  const isPublished = section.status === "published";
  const isArchived = section.status === "archived";

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
    const filePath = `${houseId}/${section.id}/${Date.now()}-${randomId}-${safeFileName}`;

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

  function buildFormData() {
    const formElement = formRef.current;

    if (!formElement) {
      throw new Error("Форму інформаційного матеріалу не знайдено.");
    }

    return new FormData(formElement);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setActionError(null);

    let uploadedCoverImage: Awaited<ReturnType<typeof uploadCoverImage>> | null = null;

    try {
      const formData = buildFormData();
      uploadedCoverImage = selectedCoverImage
        ? await uploadCoverImage(selectedCoverImage)
        : null;

      const result = await dispatch(
        {
          type: "information_posts.update",
          houseId,
          payload: {
            id: section.id,
            lockVersion: getLockVersion(section),
            headline: String(formData.get("headline") ?? ""),
            category: String(formData.get("category") ?? INFORMATION_CATEGORIES[0]),
            body: String(formData.get("body") ?? ""),
            isPinned,
            coverImage: uploadedCoverImage,
          },
        },
        {
          onSuccess: () => onClose(),
          onError: setActionError,
        },
      );

      if (!result && uploadedCoverImage) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage
          .from(uploadedCoverImage.bucket)
          .remove([uploadedCoverImage.path]);
      }
    } catch (error) {
      if (uploadedCoverImage) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage
          .from(uploadedCoverImage.bucket)
          .remove([uploadedCoverImage.path]);
      }

      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти інформаційний матеріал.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function runMutation(kind: "publish" | "archive" | "delete") {
    setActionError(null);
    setPendingAction(kind);

    const commandType =
      kind === "publish"
        ? "information_posts.publish"
        : kind === "archive"
          ? "information_posts.archive"
          : "information_posts.delete";

    try {
      await dispatch(
        {
          type: commandType,
          houseId,
          payload: {
            id: section.id,
            lockVersion: getLockVersion(section),
          },
        },
        {
          onSuccess: () => onClose(),
          onError: setActionError,
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося виконати дію.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  void houseSlug;

  const combinedError = actionError;
  const buttonsDisabled = isPending || pendingAction !== null || isSaving;

  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <form
        ref={formRef}
        id="information-post-edit-form"
        onSubmit={handleSave}
        className="grid gap-4"
      >
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

          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className={adminIconButtonClasses()}
            >
              ×
            </button>
          </div>
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
            <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)]">
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
                className={adminButtonClasses({ variant: "primary" })}
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

        {combinedError ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {combinedError}
          </div>
        ) : null}
      </form>

      {/* ACTIONS */}
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="submit"
            form="information-post-edit-form"
            disabled={buttonsDisabled}
            className={`${adminButtonClasses({ variant: "primary" })} disabled:opacity-60`}
          >
            {isSaving ? "Зберігаємо..." : "Зберегти"}
          </button>

          {(isDraft || isArchived) ? (
            <button
              type="button"
              disabled={buttonsDisabled}
              onClick={() => setConfirmAction("delete")}
              className={`${adminButtonClasses({ variant: "danger" })} disabled:opacity-60`}
            >
              {pendingAction === "delete" ? "Видаляємо..." : "Видалити"}
            </button>
          ) : null}
        </div>
        <div className="flex gap-3">

          {isDraft ? (
            <button
              type="button"
              disabled={buttonsDisabled}
              onClick={() => setConfirmAction("publish")}
              className={`${adminButtonClasses({ variant: "success" })} disabled:opacity-60`}
            >
              {pendingAction === "publish" ? "Публікуємо..." : "Опублікувати"}
            </button>
          ) : null}

          {isPublished ? (
            <button
              type="button"
              disabled={buttonsDisabled}
              onClick={() => setConfirmAction("archive")}
              className={`${adminButtonClasses({ variant: "secondary" })} disabled:opacity-60`}
            >
              {pendingAction === "archive" ? "Переносимо..." : "В архів"}
            </button>
          ) : null}
        </div>
      </div>

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title={isArchived ? "Видалити архівний матеріал?" : "Видалити чернетку матеріалу?"}
        description={
          isArchived
            ? "Архівний інформаційний матеріал буде видалено із системи без можливості відновлення."
            : "Чернетку інформаційного матеріалу буде видалено без можливості відновлення."
        }
        confirmLabel="Видалити матеріал"
        pendingLabel="Видаляємо..."
        tone="destructive"
        isPending={pendingAction === "delete"}
        onCancel={() => {
          if (!pendingAction) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void runMutation("delete");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Підтвердити публікацію матеріалу?"
        description="Після підтвердження матеріал стане видимим для мешканців на сторінці інформації."
        confirmLabel="Підтвердити публікацію"
        pendingLabel="Підтверджуємо..."
        tone="publish"
        isPending={pendingAction === "publish"}
        onCancel={() => {
          if (!pendingAction) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void runMutation("publish");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перенести матеріал в архів?"
        description="Після архівації матеріал зникне з публічної частини сайту. У CMS він залишиться доступним в архіві."
        confirmLabel="Архівувати матеріал"
        pendingLabel="Архівуємо..."
        tone="warning"
        isPending={pendingAction === "archive"}
        onCancel={() => {
          if (!pendingAction) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          void runMutation("archive");
        }}
      />
    </div>
  );
}
