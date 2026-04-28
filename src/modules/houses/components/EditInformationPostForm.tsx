"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveHouseInformationSection } from "@/src/modules/houses/actions/archiveHouseInformationSection";
import { deleteHouseSection } from "@/src/modules/houses/actions/deleteHouseSection";
import { publishHouseInformationSection } from "@/src/modules/houses/actions/publishHouseInformationSection";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
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
        action={(formData) => {
          if (selectedCoverImage) {
            formData.set("coverImage", selectedCoverImage);
          }
          return formAction(formData);
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
            maxLength={256}
            rows={6}
            onChange={(e) => setBody(e.target.value)}
            className={adminInputClass}
            required
          />
          <div className="mt-2 text-xs text-[var(--cms-text-muted)]">
            {body.length}/256
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
            disabled={isPending}
            onClick={() => (hasSubmittedRef.current = true)}
            className={`${adminPrimaryButtonClass} disabled:opacity-60`}
          >
            {isPending ? "Зберігаємо..." : "Зберегти"}
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
