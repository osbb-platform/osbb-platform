"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createHouseInformationFaqSection } from "@/src/modules/houses/actions/createHouseInformationFaqSection";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { deleteHouseSection } from "@/src/modules/houses/actions/deleteHouseSection";

import {
  adminPrimaryButtonClass,
  adminSuccessButtonClass,
  adminDangerButtonClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

type DeleteState = { error: string | null };

const initialState: DeleteState = { error: null };

type Props = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  section: { id: string; status: "draft" | "in_review" | "published" | "archived"; content: { items?: { question: string; answer: string }[]; }; } | null;
  onClose: () => void;
};

export function EditInformationFaqForm({
  houseId,
  houseSlug,
  housePageId,
  section,
  onClose,
}: Props) {
  const router = useRouter();
  const actionToUse = section ? updateHouseSection : createHouseInformationFaqSection;

  const [state, formAction, isPending] = useActionState(actionToUse, initialState);

  const deleteWrapper = async (state: DeleteState, formData: FormData) => {
    return deleteHouseSection(formData);
  };

  const [, deleteAction, isDeletePending] = useActionState(deleteWrapper, initialState);

  const initialItems = useMemo(() => {
    if (!section) return [{ question: "", answer: "" }];

    const items = Array.isArray(section.content.items)
      ? section.content.items
      : [];

    return items.length ? items : [{ question: "", answer: "" }];
  }, [section]);

  const [items, setItems] = useState(initialItems);
  const [isPublishing, setIsPublishing] = useState(false);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (!hasSubmittedRef.current) return;

    if (!isPending && state.error === null) {
      router.refresh();
      onClose();
      hasSubmittedRef.current = false;
    }
  }, [isPending, state.error, router, onClose]);

  function updateItem(index: number, field: string, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { question: "", answer: "" }]);
  }

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
    >
      <input type="hidden" name="sectionId" value={section?.id ?? ""} />
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="housePageId" value={housePageId ?? ""} />
      <input type="hidden" name="kind" value="faq" />
      <input type="hidden" name="title" value="FAQ" />
      <input
        type="hidden"
        name="status"
        value={isPublishing ? "published" : (section?.status ?? "draft")}
      />
      <input
        type="hidden"
        name="faqPayload"
        value={JSON.stringify(items)}
      />

      {/* HEADER */}
      <div className="mb-4 flex justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--cms-text)]">
            FAQ
          </div>
          <div className="text-sm text-[var(--cms-text-muted)]">
            Додавайте запитання та відповіді
          </div>
        </div>

        <button type="button" onClick={onClose} className={adminIconButtonClass}>
          ×
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className={adminInsetSurfaceClass}>
            <div className="grid gap-3">
              <input
                value={item.question}
                onChange={(e) => updateItem(index, "question", e.target.value)}
                placeholder="Запитання"
                className={adminInputClass}
              />

              <textarea
                value={item.answer}
                onChange={(e) => updateItem(index, "answer", e.target.value)}
                rows={4}
                placeholder="Відповідь"
                className={adminInputClass}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADD */}
      <div className="mt-4">
        <button type="button" onClick={addItem} className={adminPrimaryButtonClass}>
          + Додати
        </button>
      </div>

      {state.error && (
        <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {/* ACTIONS */}
      <div className="mt-6 flex justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            onClick={() => {
              hasSubmittedRef.current = true;
              setIsPublishing(false);
            }}
            className={adminPrimaryButtonClass}
          >
            Зберегти
          </button>

          {section && (
            <button
              type="submit"
              formAction={deleteAction}
              disabled={isDeletePending}
              className={adminDangerButtonClass}
            >
              Видалити
            </button>
          )}
        </div>

        {section && (
          <button
            type="submit"
            disabled={isPending}
            onClick={() => {
              hasSubmittedRef.current = true;
              setIsPublishing(true);
            }}
            className={adminSuccessButtonClass}
          >
            Підтвердити
          </button>
        )}
      </div>
    </form>
  );
}
