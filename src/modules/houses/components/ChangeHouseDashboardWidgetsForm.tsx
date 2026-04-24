"use client";

import { useEffect, useMemo, useState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { getOrCreateHomeWidgetsSection } from "@/src/modules/houses/actions/getOrCreateHomeWidgetsSection";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type Widget = {
  id: string;
  label: string;
  value: string;
};

type Props = {
  sectionId: string;
  houseId: string;
  houseSlug: string;
  initialWidgets: Widget[];
};

function createEmptyWidget(index: number): Widget {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `widget-${Date.now()}-${index}`,
    label: "",
    value: "",
  };
}

function ensureAtLeastTwo(widgets: Widget[]): Widget[] {
  if (widgets.length >= 2) return widgets;
  const next = [...widgets];
  while (next.length < 2) {
    next.push(createEmptyWidget(next.length));
  }
  return next;
}

export function ChangeHouseDashboardWidgetsForm({
  sectionId,
  houseId,
  houseSlug,
  initialWidgets,
}: Props) {
  const [widgets, setWidgets] = useState<Widget[]>(ensureAtLeastTwo(initialWidgets));
  const [realSectionId, setRealSectionId] = useState<string | null>(sectionId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSection, setIsLoadingSection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const section = await getOrCreateHomeWidgetsSection(houseId);
        if (cancelled) return;

        setRealSectionId(section.id);

        const loadedWidgets = Array.isArray(section.content?.statusWidgets)
          ? (section.content.statusWidgets as Widget[])
          : [];

        setWidgets(ensureAtLeastTwo(loadedWidgets));
      } catch (e) {
        console.error("Failed to load home indicators section", e);
        if (!cancelled) {
          setError("Не вдалося завантажити показники будинку.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSection(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [houseId]);

  function addWidget() {
    if (widgets.length >= 6) return;
    setWidgets((current) => [...current, createEmptyWidget(current.length)]);
  }

  function updateWidget(index: number, field: keyof Widget, value: string) {
    setWidgets((current) =>
      current.map((widget, widgetIndex) =>
        widgetIndex === index
          ? {
              ...widget,
              [field]: field === "label" ? value.slice(0, 30) : value,
            }
          : widget,
      ),
    );
  }

  function removeWidget(index: number) {
    if (widgets.length <= 2) return;
    setWidgets((current) => current.filter((_, widgetIndex) => widgetIndex !== index));
  }

  const cleaned = useMemo(
    () =>
      widgets
        .map((widget) => ({
          ...widget,
          label: widget.label.trim().slice(0, 30),
          value: widget.value.trim(),
        }))
        .filter((widget) => widget.label && widget.value),
    [widgets],
  );

  const canSave =
    !isLoadingSection &&
    !isSaving &&
    Boolean(realSectionId) &&
    cleaned.length >= 2;

  async function handleSubmit() {
    if (!realSectionId) {
      setError("Не вдалося підготувати форму для збереження.");
      return;
    }

    if (cleaned.length < 2) {
      setError("Заповніть щонайменше 2 показники, щоб зберегти блок.");
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("sectionId", realSectionId);
    formData.append("houseId", houseId);
    formData.append("houseSlug", houseSlug);
    formData.append("kind", "custom");
    formData.append("status", "published");
    formData.append("title", "Home widgets");
    formData.append(
      "payload",
      JSON.stringify({
        statusWidgets: cleaned,
      }),
    );

    const result = await updateHouseSection({ error: null }, formData);

    if (result?.error) {
      setError(result.error);
      setSuccessMessage(null);
      setIsSaving(false);
      return;
    }

    setError(null);
    setSuccessMessage("Показники головної сторінки збережено.");
    setIsSaving(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 px-6 py-5">
        {widgets.map((widget, index) => (
          <div
            key={widget.id}
            className="space-y-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className={`text-sm font-medium ${adminTextLabelClass}`}>
                Показник {index + 1}
              </div>

              <button
                type="button"
                onClick={() => removeWidget(index)}
                disabled={widgets.length <= 2}
                className={`${adminSecondaryButtonClass} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Видалити
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className={adminTextLabelClass}>
                  Заголовок
                </label>
                <span className="text-xs text-[var(--cms-text-muted)]">
                  {widget.label.length}/30
                </span>
              </div>

              <input
                type="text"
                placeholder="Наприклад: Тариф"
                maxLength={30}
                value={widget.label}
                onChange={(event) => updateWidget(index, "label", event.target.value)}
                className={adminInputClass}
              />
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Значення
              </label>
              <input
                type="text"
                placeholder="Наприклад: 12 ₴/м²"
                value={widget.value}
                onChange={(event) => updateWidget(index, "value", event.target.value)}
                className={adminInputClass}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-6 py-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addWidget}
            disabled={widgets.length >= 6}
            className={`${adminSecondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Додати показник
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave}
            className={`${adminPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isSaving ? "Зберігаємо..." : "Зберегти"}
          </button>
        </div>

        {cleaned.length < 2 ? (
          <div className="mt-3 rounded-2xl border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] px-4 py-2.5 text-sm text-[var(--cms-warning-text)]">
            Заповніть щонайменше 2 показники, щоб показати блок на головній сторінці.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
            {successMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
