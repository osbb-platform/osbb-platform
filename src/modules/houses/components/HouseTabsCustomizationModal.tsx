"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TabOption = {
  value: string;
  label: string;
};

type HouseTabsCustomizationModalProps = {
  blocks: readonly TabOption[];
  order: string[];
  pinned: string[];
  onClose: () => void;
  onSave: (config: { order: string[]; pinned: string[] }) => void;
};

function moveItem(items: string[], source: string, target: string) {
  if (source === target) return items;

  const sourceIndex = items.indexOf(source);
  const targetIndex = items.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) return items;

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function HouseTabsCustomizationModal({
  blocks,
  order,
  pinned,
  onClose,
  onSave,
}: HouseTabsCustomizationModalProps) {
  const [draftOrder, setDraftOrder] = useState(order);
  const [draftPinned, setDraftPinned] = useState(pinned);
  const [draggedValue, setDraggedValue] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const blockByValue = new Map(blocks.map((block) => [block.value, block]));
  const defaultOrder = blocks.map((block) => block.value);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-tabs-customization-title"
        className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] shadow-[var(--cms-shadow-lg)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--cms-border)] px-5 py-4">
          <div>
            <h2
              id="house-tabs-customization-title"
              className="text-lg font-semibold text-[var(--cms-text)]"
            >
              Налаштувати вкладки
            </h2>
            <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
              Перетягуйте вкладки та закріплюйте важливі на панелі.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] text-xl text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-surface-muted)] hover:text-[var(--cms-text)]"
            aria-label="Закрити налаштування вкладок"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {draftOrder.map((value) => {
              const block = blockByValue.get(value);
              if (!block) return null;

              const isPinned = draftPinned.includes(value);
              const isDragging = draggedValue === value;

              return (
                <div
                  key={value}
                  draggable
                  onDragStart={(event) => {
                    setDraggedValue(value);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", value);
                  }}
                  onDragEnd={() => setDraggedValue(null)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const source =
                      draggedValue || event.dataTransfer.getData("text/plain");
                    if (source) {
                      setDraftOrder((current) =>
                        moveItem(current, source, value),
                      );
                    }
                    setDraggedValue(null);
                  }}
                  className={`flex items-center gap-3 rounded-[var(--r-lg)] border px-3 py-3 transition ${
                    isDragging
                      ? "border-[var(--cms-accent-primary)] bg-[var(--cms-pill-bg)] opacity-70"
                      : "border-[var(--cms-border)] bg-[var(--cms-surface)]"
                  }`}
                >
                  <span
                    className="cursor-grab select-none text-lg text-[var(--cms-text-muted)] active:cursor-grabbing"
                    aria-hidden="true"
                    title="Перетягнути"
                  >
                    ⋮⋮
                  </span>

                  <span className="min-w-0 flex-1 font-medium text-[var(--cms-text)]">
                    {block.label}
                  </span>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--cms-text-muted)]">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={() => {
                        setDraftPinned((current) =>
                          current.includes(value)
                            ? current.filter((item) => item !== value)
                            : [...current, value],
                        );
                      }}
                      className="h-4 w-4 rounded border-[var(--cms-border)] accent-[var(--cms-accent-primary)]"
                    />
                    Завжди на панелі
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cms-border)] px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setDraftOrder(defaultOrder);
              setDraftPinned([]);
            }}
            className="inline-flex h-10 items-center rounded-[var(--r-md)] px-3 text-sm font-medium text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-surface-muted)] hover:text-[var(--cms-text)]"
          >
            Скинути до стандартних
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)]"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={() =>
                onSave({ order: draftOrder, pinned: draftPinned })
              }
              className="inline-flex h-10 items-center rounded-[var(--r-md)] bg-[var(--cms-accent-primary)] px-4 text-sm font-semibold text-white shadow-[var(--cms-shadow-sm)] transition hover:brightness-95"
            >
              Зберегти
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
