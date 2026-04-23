"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createHouseInformationSection } from "@/src/modules/houses/actions/createHouseInformationSection";
import { INFORMATION_CATEGORIES } from "@/src/modules/houses/components/HouseInformationWorkspace";

import {
  adminPrimaryButtonClass,
  adminInputClass,
  adminIconButtonClass,
  adminInsetSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

const initialState = { error: null };

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
      action={(formData) => {
        if (selectedCoverImage) {
          formData.set("coverImage", selectedCoverImage);
        }
        return formAction(formData);
      }}
      className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
    >
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="housePageId" value={housePageId ?? ""} />
      <input type="hidden" name="isPinned" value={isPinned ? "true" : "false"} />

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

              <input
                ref={fileInputRef}
                name="coverImage"
                type="file"
                hidden
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

      {state.error && (
        <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {/* ACTIONS */}
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          onClick={() => (hasSubmittedRef.current = true)}
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
