"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import {
  adminBodyClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSectionTitleClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type RequisitesSnapshot = {
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purposeTemplate: string;
  paymentUrl: string;
  paymentButtonLabel: string;
};

type Props = {
  readOnlyMode?: boolean;
  houseId: string;
  houseSlug: string;
  section: {
    id: string;
    title: string | null;
    content: Record<string, unknown>;
  } | null;
};

const initialState = {
  error: null,
};

const DEFAULT_SNAPSHOT: RequisitesSnapshot = {
  recipient: "",
  iban: "",
  edrpou: "",
  bank: "",
  purposeTemplate:
    "Оплата внесків за квартиру {{apartment}}, особовий рахунок {{account}}, за {{period}}",
  paymentUrl: "",
  paymentButtonLabel: "Перейти до оплати",
};

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);
  return /^UA\d{27}$/.test(iban);
}
function normalizeLegacyPurposeTemplate(value: string) {
  const normalized = value.trim();

  if (
    normalized ===
    "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}"
  ) {
    return "Оплата внесків за квартиру {{apartment}}, особовий рахунок {{account}}, за {{period}}";
  }

  return normalized;
}

function normalizeSnapshot(value: unknown): RequisitesSnapshot {
  if (!value || typeof value !== "object") {
    return DEFAULT_SNAPSHOT;
  }

  const raw = value as Record<string, unknown>;

  return {
    recipient: String(raw.recipient ?? "").trim(),
    iban: String(raw.iban ?? "").trim(),
    edrpou: String(raw.edrpou ?? "").trim(),
    bank: String(raw.bank ?? "").trim(),
    purposeTemplate:
      normalizeLegacyPurposeTemplate(
        String(raw.purposeTemplate ?? DEFAULT_SNAPSHOT.purposeTemplate),
      ) || DEFAULT_SNAPSHOT.purposeTemplate,
    paymentUrl: String(raw.paymentUrl ?? "").trim(),
    paymentButtonLabel:
      String(raw.paymentButtonLabel ?? DEFAULT_SNAPSHOT.paymentButtonLabel).trim() ||
      DEFAULT_SNAPSHOT.paymentButtonLabel,
  };
}

export function HouseRequisitesWorkspace({
  houseId,
  houseSlug,
  section,
  readOnlyMode,
}: Props) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const initialSnapshot = useMemo(
    () => normalizeSnapshot(section?.content),
    [section],
  );

  const [snapshot, setSnapshot] =
    useState<RequisitesSnapshot>(initialSnapshot);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    if (!isPending && !state.error) {
      setIsEditing(false);

      startTransition(() => {
        router.refresh();
      });
    }
  }, [isPending, router, state.error]);

  const normalizedIban = useMemo(
    () => normalizeIban(snapshot.iban),
    [snapshot.iban],
  );

  const ibanTouched = snapshot.iban.trim().length > 0;
  const ibanValid = !ibanTouched || isValidIban(snapshot.iban);

  const requiredFieldsReady = [
    snapshot.recipient,
    snapshot.edrpou,
    snapshot.bank,
    snapshot.purposeTemplate,
  ].every((value) => value.trim().length > 0);

  const publishReady =
    requiredFieldsReady &&
    normalizedIban.length > 0 &&
    isValidIban(normalizedIban);

  const isDirty =
    JSON.stringify(snapshot) !== JSON.stringify(initialSnapshot);

  function updateField<K extends keyof RequisitesSnapshot>(
    key: K,
    value: RequisitesSnapshot[K],
  ) {
    setSnapshot((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleOpenSettings() {
    setIsEditing(true);
  }

  function handleCloseEditing() {
    setSnapshot(initialSnapshot);
    setIsEditing(false);
  }

  return (
    <div className="space-y-6">
      {!isEditing ? (
        <div className={`${adminSurfaceClass} p-6`}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--cms-text)]">Реквізити</h2>
                <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                  Банківські реквізити та дані для оплати, які мешканці бачать на сайті будинку.
                </p>
              </div>

              {!readOnlyMode ? (
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="inline-flex rounded-2xl border border-[var(--cms-border-strong)] px-4 py-2 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                >
                  Редагувати
                </button>
              ) : null}
            </div>

            <div className="rounded-3xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] p-6 text-[var(--cms-text)]">
              <div className="space-y-3">
                <div><span className="text-[var(--cms-text-muted)]">Отримувач:</span> {snapshot.recipient || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">IBAN:</span> {snapshot.iban || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">ЕДРПОУ:</span> {snapshot.edrpou || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">Банк:</span> {snapshot.bank || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">Призначення платежу:</span> {snapshot.purposeTemplate || "—"}</div>
                <div className="break-words">
                  <span className="text-[var(--cms-text-muted)]">Онлайн-оплата:</span>{" "}
                  <span className="break-all text-[var(--cms-text)]">
                    {snapshot.paymentUrl || "Не підключена"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <form action={formAction} className={`space-y-6 ${adminSurfaceClass} p-6`}>
            <div className="space-y-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={adminSectionTitleClass}>
                    Редагування реквізитів
                  </h3>
                  <p className={`mt-2 ${adminBodyClass}`}>
                    Після збереження зміни одразу оновлять публічну сторінку будинку.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseEditing}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] text-lg font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
                  aria-label="Закрити форму"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className={`mb-2 ${adminTextLabelClass}`}>
                    Отримувач платежу
                  </div>
                  <input
                    value={snapshot.recipient}
                    onChange={(e) => updateField("recipient", e.target.value)}
                    placeholder="ОСББ Чарівна 123А"
                    className={adminInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <div className={adminTextLabelClass}>
                    IBAN для копіювання
                  </div>
                  <input
                    value={snapshot.iban}
                    onChange={(e) => updateField("iban", normalizeIban(e.target.value))}
                    placeholder="UA123456789012345678901234567"
                    className={`w-full rounded-2xl border px-4 py-3 text-white ${
                      ibanValid
                        ? "border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text)]"
                        : "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)]"
                    }`}
                  />
                  {!ibanValid ? (
                    <div className="text-xs text-[var(--cms-danger-text)]">
                      Введіть коректний український IBAN у форматі UA + 27 цифр.
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className={`mb-2 ${adminTextLabelClass}`}>
                    ЕДРПОУ
                  </div>
                  <input
                    value={snapshot.edrpou}
                    onChange={(e) => updateField("edrpou", e.target.value)}
                    placeholder="12345678"
                    className={adminInputClass}
                  />
                </div>

                <div>
                  <div className={`mb-2 ${adminTextLabelClass}`}>
                    Банк отримувача
                  </div>
                  <input
                    value={snapshot.bank}
                    onChange={(e) => updateField("bank", e.target.value)}
                    placeholder="ПриватБанк"
                    className={adminInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={adminTextLabelClass}>
                Призначення платежу
              </div>

              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Це текст, який буде показано мешканцю на сторінці оплати.
              </p>

              <textarea
                value={snapshot.purposeTemplate}
                onChange={(e) => updateField("purposeTemplate", e.target.value)}
                rows={4}
                placeholder="Оплата внесків за квартиру {{apartment}}, особовий рахунок {{account}}, за {{period}}"
                className={`mt-5 ${adminInputClass}`}
              />
            </div>

            <div className="space-y-4">
              <div className={adminTextLabelClass}>
                Додаткова онлайн-оплата
              </div>

              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Необов’язковий блок. Якщо посилання не вказане, мешканці використовуватимуть лише реквізити вище.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  value={snapshot.paymentUrl}
                  onChange={(e) => updateField("paymentUrl", e.target.value)}
                  placeholder="https://example.com/pay"
                  className={adminInputClass}
                />
                <input
                  value={snapshot.paymentButtonLabel}
                  onChange={(e) => updateField("paymentButtonLabel", e.target.value)}
                  placeholder="Перейти до оплати"
                  className={adminInputClass}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className={adminTextLabelClass}>
                Попередній перегляд сторінки для мешканця
              </div>

              <div className="mt-5 rounded-3xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] p-6 text-[var(--cms-text)]">
                <div className="space-y-3">
                  <div><span className="text-[var(--cms-text-muted)]">Отримувач:</span> {snapshot.recipient || "—"}</div>
                  <div><span className="text-[var(--cms-text-muted)]">IBAN:</span> {snapshot.iban || "—"}</div>
                  <div><span className="text-[var(--cms-text-muted)]">ЕДРПОУ:</span> {snapshot.edrpou || "—"}</div>
                  <div><span className="text-[var(--cms-text-muted)]">Банк:</span> {snapshot.bank || "—"}</div>
                  <div><span className="text-[var(--cms-text-muted)]">Призначення платежу:</span> {snapshot.purposeTemplate || "—"}</div>
                  <div><span className="text-[var(--cms-text-muted)]">Онлайн-оплата:</span> {snapshot.paymentUrl ? (snapshot.paymentButtonLabel || "Перейти до оплати") : "Не підключена"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <input type="hidden" name="sectionId" value={section?.id ?? ""} />
              <input type="hidden" name="title" value="Реквізити" />
              <input type="hidden" name="kind" value="requisites" />
              <input type="hidden" name="status" value="published" />
              <input type="hidden" name="content" value={JSON.stringify(snapshot)} />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending || !isDirty || !publishReady}
                  className={`${adminPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isPending ? "Зберігаємо..." : "Зберегти"}
                </button>

                <button
                  type="button"
                  onClick={() => setSnapshot(DEFAULT_SNAPSHOT)}
                  disabled={isPending}
                  className={`${adminSecondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Скинути
                </button>
              </div>

              {state.error ? (
                <div className="mt-4 text-sm text-[var(--cms-danger-text)]">{state.error}</div>
              ) : null}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
