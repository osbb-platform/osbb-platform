"use client";

import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type {
  HouseHomeWidget,
  HouseHomeWidgetsSnapshot,
} from "@/src/modules/houses/services/getAdminHouseHomeWidgets";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type Widget = HouseHomeWidget;

type Props = {
  /**
   * Legacy props are kept for compatibility with the existing registry card.
   * They are not used by the new content-engine command path.
   */
  sectionId?: string;
  houseId: string;
  houseSlug?: string;
  initialWidgets: Widget[];
  initialLockVersion?: number;
  readOnlyMode?: boolean;
  onSaved?: (snapshot: HouseHomeWidgetsSnapshot) => void;
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

function ensureAtLeastOne(widgets: Widget[]): Widget[] {
  if (widgets.length >= 1) return widgets;
  return [createEmptyWidget(0)];
}

function normalizeWidgets(widgets: Widget[]): Widget[] {
  return widgets
    .map((widget) => ({
      id: widget.id,
      label: widget.label.trim().slice(0, 30),
      value: widget.value.trim(),
    }))
    .filter((widget) => widget.label && widget.value)
    .slice(0, 6);
}

function normalizeSavedRow(value: HouseHomeWidgetsSnapshot | Record<string, unknown>) {
  const record = value as Record<string, unknown>;

  const statusWidgets = Array.isArray(record.statusWidgets)
    ? (record.statusWidgets as Widget[])
    : Array.isArray(record.status_widgets)
      ? (record.status_widgets as Widget[])
      : [];

  const lockVersion =
    typeof record.lockVersion === "number"
      ? record.lockVersion
      : typeof record.lock_version === "number"
        ? record.lock_version
        : 1;

  return {
    statusWidgets: normalizeWidgets(statusWidgets),
    lockVersion,
  };
}

export function ChangeHouseDashboardWidgetsForm({
  houseId,
  initialWidgets,
  initialLockVersion = 1,
  readOnlyMode,
  onSaved,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const initialSnapshot = useMemo(
    () => normalizeWidgets(initialWidgets),
    [initialWidgets],
  );

  const [widgets, setWidgets] = useState<Widget[]>(ensureAtLeastOne(initialSnapshot));
  const [lockVersion, setLockVersion] = useState(initialLockVersion);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function addWidget() {
    if (widgets.length >= 6 || readOnlyMode) return;
    setWidgets((current) => [...current, createEmptyWidget(current.length)]);
    setSuccessMessage(null);
  }

  function updateWidget(index: number, field: keyof Widget, value: string) {
    if (readOnlyMode) return;

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
    setSuccessMessage(null);
  }

  function removeWidget(index: number) {
    if (widgets.length <= 1 || readOnlyMode) return;
    setWidgets((current) => current.filter((_, widgetIndex) => widgetIndex !== index));
    setSuccessMessage(null);
  }

  const cleaned = useMemo(() => normalizeWidgets(widgets), [widgets]);

  const isDirty = JSON.stringify(cleaned) !== JSON.stringify(initialSnapshot);

  const canSave =
    !readOnlyMode &&
    !isPending &&
    cleaned.length >= 1 &&
    isDirty;

  async function handleSubmit() {
    if (readOnlyMode) {
      return;
    }

    if (cleaned.length < 1) {
      setSuccessMessage(null);
      return;
    }

    setSuccessMessage(null);

    await dispatch<HouseHomeWidgetsSnapshot>(
      {
        type: "home_widgets.save",
        houseId,
        payload: {
          lockVersion,
          statusWidgets: cleaned,
        },
      },
      {
        onSuccess(data) {
          const savedSnapshot = data as HouseHomeWidgetsSnapshot;
          const saved = normalizeSavedRow(savedSnapshot);
          setLockVersion(saved.lockVersion);
          setWidgets(ensureAtLeastOne(saved.statusWidgets));
          onSaved?.(savedSnapshot);
          setSuccessMessage("Показники головної сторінки збережено.");
        },
      },
    );
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
                disabled={readOnlyMode || widgets.length <= 1}
                className={`${adminSecondaryButtonClass} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Видалити
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className={adminTextLabelClass}>Заголовок</label>
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
                disabled={readOnlyMode}
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
                disabled={readOnlyMode}
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
            disabled={readOnlyMode || widgets.length >= 6}
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
            {isPending ? "Зберігаємо..." : "Зберегти"}
          </button>
        </div>

        {readOnlyMode ? (
          <div className="mt-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-2.5 text-sm text-[var(--cms-text-muted)]">
            У вас немає прав на редагування цього блоку.
          </div>
        ) : null}

        {cleaned.length < 1 ? (
          <div className="mt-3 rounded-2xl border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] px-4 py-2.5 text-sm text-[var(--cms-warning-text)]">
            Заповніть щонайменше 1 показник, щоб показати блок на головній сторінці.
          </div>
        ) : null}

        {lastError ? (
          <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {lastError}
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
