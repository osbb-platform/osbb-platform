"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/src/shared/ui/admin/Button";
import {
  adminModalClass,
  adminOverlayClass,
} from "@/src/shared/ui/admin/adminStyles";

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
      className={[adminOverlayClass, "z-[120] flex items-center justify-center p-4"].join(" ")}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-tabs-customization-title"
        className={[
          adminModalClass,
          "flex max-h-[min(640px,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden",
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--cms-border)] px-4 py-3.5">
          <div className="min-w-0">
            <h2
              id="house-tabs-customization-title"
              className="text-base font-semibold text-[var(--cms-text)]"
            >
              Налаштувати вкладки
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-[var(--cms-text-muted)]">
              Змініть порядок і закріпіть важливі розділи.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-md)] text-lg text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-surface-muted)] hover:text-[var(--cms-text)]"
            aria-label="Закрити налаштування вкладок"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-1.5">
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
                  className={[
                    "flex min-h-11 items-center gap-2.5 rounded-[var(--r-lg)] border px-3 py-2 transition",
                    isDragging
                      ? "border-[var(--cms-accent-primary)] bg-[var(--cms-pill-bg)] opacity-70"
                      : "border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] hover:border-[var(--cms-border-strong)]",
                  ].join(" ")}
                >
                  <span
                    className="cursor-grab select-none text-base leading-none text-[var(--cms-text-soft)] active:cursor-grabbing"
                    aria-hidden="true"
                    title="Перетягнути"
                  >
                    ⠿
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--cms-text)]">
                    {block.label}
                  </span>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--cms-text-muted)]">
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
                      className="h-4 w-4 rounded border-[var(--cms-border-strong)] accent-[var(--cms-accent-primary)]"
                    />
                    <span className="hidden sm:inline">На панелі</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cms-border)] px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraftOrder(defaultOrder);
              setDraftPinned([]);
            }}
          >
            Скинути
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Скасувати
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onSave({ order: draftOrder, pinned: draftPinned })}
            >
              Зберегти
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
