"use client";

import { useEffect, useMemo, useState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { getOrCreateHomeWidgetsSection } from "@/src/modules/houses/actions/getOrCreateHomeWidgetsSection";

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
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-200">
                Показник {index + 1}
              </div>

              <button
                type="button"
                onClick={() => removeWidget(index)}
                disabled={widgets.length <= 2}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Видалити
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-200">
                  Заголовок
                </label>
                <span className="text-xs text-slate-400">
                  {widget.label.length}/30
                </span>
              </div>

              <input
                type="text"
                placeholder="Наприклад: Тариф"
                maxLength={30}
                value={widget.label}
                onChange={(event) => updateWidget(index, "label", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Значення
              </label>
              <input
                type="text"
                placeholder="Наприклад: 12 ₴/м²"
                value={widget.value}
                onChange={(event) => updateWidget(index, "value", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-slate-800 bg-slate-950 px-6 py-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addWidget}
            disabled={widgets.length >= 6}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Додати показник
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Зберігаємо..." : "Зберегти"}
          </button>
        </div>

        {cleaned.length < 2 ? (
          <div className="mt-3 rounded-2xl border border-amber-900/70 bg-amber-950/30 px-4 py-2.5 text-sm text-amber-300">
            Заповніть щонайменше 2 показники, щоб показати блок на головній сторінці.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
