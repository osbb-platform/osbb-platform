"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createHouseInformationFaqSection } from "@/src/modules/houses/actions/createHouseInformationFaqSection";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { deleteHouseSection } from "@/src/modules/houses/actions/deleteHouseSection";

const initialState = {
  error: null,
};

type Props = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  section: {
    id: string;
    title: string;
    status: "draft" | "in_review" | "published" | "archived";
    content: Record<string, unknown>;
  } | null;
  onClose: () => void;
};

type FaqItem = {
  question: string;
  answer: string;
};

function createEmptyFaqItem(): FaqItem {
  return {
    question: "",
    answer: "",
  };
}

export function EditInformationFaqForm({
  houseId,
  houseSlug,
  housePageId,
  section,
  onClose,
}: Props) {
  const router = useRouter();
  const actionToUse = section ? updateHouseSection : createHouseInformationFaqSection;
  const [state, formAction, isPending] = useActionState(
    actionToUse,
    initialState,
  );

  const [, deleteAction, isDeletePending] = useActionState(
    deleteHouseSection,
    initialState,
  );

  const initialItems = useMemo(() => {
    if (!section) return [createEmptyFaqItem()];

    const items = Array.isArray(section.content.items)
      ? section.content.items.map((item) => {
          const raw = item as Record<string, unknown>;
          return {
            question: String(raw.question ?? ""),
            answer: String(raw.answer ?? ""),
          };
        })
      : [];

    return items.length > 0
      ? items
      : [createEmptyFaqItem(), createEmptyFaqItem()];
  }, [section]);

  const [items, setItems] = useState<FaqItem[]>(initialItems);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(initialItems),
  );

  const [isPublishing, setIsPublishing] = useState(false);
  const hasSubmittedRef = useRef(false);
  const faqDirty = JSON.stringify(items) !== savedSnapshot;

  useEffect(() => {
    if (!hasSubmittedRef.current) {
      return;
    }

    if (!isPending && state.error === null) {
      router.refresh();
      onClose();
      hasSubmittedRef.current = false;
    }
  }, [isPending, state.error, router, onClose]);

  function handleItemChange(
    index: number,
    field: keyof FaqItem,
    value: string,
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addFaqItem() {
    setItems((prev) => [...prev, createEmptyFaqItem()]);
  }

  useEffect(() => {
    setItems(initialItems);
    setSavedSnapshot(JSON.stringify(initialItems));
  }, [initialItems]);

  const normalizedItems = items.filter(
    (item) => item.question.trim() || item.answer.trim(),
  );

  return (
    <form action={formAction} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <input type="hidden" name="sectionId" value={section?.id ?? ""} />
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="housePageId" value={housePageId ?? ""} />
      <input type="hidden" name="kind" value="faq" />
      <input type="hidden" name="title" value="FAQ" />
      <input type="hidden" name="status" value={isPublishing ? "published" : (section?.status ?? "draft")} />
      <input
        type="hidden"
        name="faqPayload"
        value={JSON.stringify(normalizedItems)}
      />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">FAQ</div>
          <div className="mt-2 text-sm leading-6 text-slate-400">
            Добавляйте вопросы и ответы. Через + можно создавать новые строки
            без ограничений.
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть форму"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
        >
          ×
        </button>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => (
          <div
            key={`faq-item-${index}`}
            className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Вопрос
                </label>
                <input
                  value={item.question}
                  onChange={(event) =>
                    handleItemChange(index, "question", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                  placeholder="Введите вопрос"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Ответ
                </label>
                <textarea
                  value={item.answer}
                  onChange={(event) =>
                    handleItemChange(index, "answer", event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                  placeholder="Введите ответ"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={addFaqItem}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-xl text-white transition hover:bg-slate-800"
          aria-label="Добавить FAQ"
        >
          +
        </button>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!housePageId || (section ? !faqDirty || isPending : isPending)}
            onClick={() => {
              hasSubmittedRef.current = true;
              setIsPublishing(false);
              setSavedSnapshot(JSON.stringify(items));
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Сохраняем..." : "Сохранить"}
          </button>

          {section && section.status !== "published" ? (
            <button
              type="submit"
              formAction={deleteAction}
              disabled={isDeletePending}
              className="inline-flex items-center justify-center rounded-2xl border border-red-800 bg-red-950/30 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeletePending ? "Удаляем..." : "Удалить"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {section ? (
            section.status !== "published" ? (
              <button
                type="submit"
                disabled={!housePageId || isPending}
                onClick={() => {
                  hasSubmittedRef.current = true;
                  setIsPublishing(true);
                  setSavedSnapshot(JSON.stringify(items));
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-800 bg-emerald-950/30 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending && isPublishing ? "Подтверждаем..." : "Подтвердить"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-amber-800 bg-amber-950/30 px-5 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-950/50"
              >
                Архивировать
              </button>
            )
          ) : null}
        </div>
      </div>
    </form>
  );
}
