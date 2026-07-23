"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseRequisitesSnapshot } from "@/src/modules/houses/services/getAdminHouseRequisites";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { Button } from "@/src/shared/ui/admin/Button";
import { FormField } from "@/src/shared/ui/admin/FormField";
import { Input } from "@/src/shared/ui/admin/Input";
import {
  adminSurfaceClass,
  adminTextareaClass,
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
  requisites: HouseRequisitesSnapshot;
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

function toSafeString(value: unknown, fallback = "") {
  return String(value ?? fallback);
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);
  return /^UA\d{27}$/.test(iban);
}

function normalizeLegacyPurposeTemplate(value: unknown) {
  const normalized = toSafeString(value).trim();

  if (
    normalized ===
    "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}"
  ) {
    return "Оплата внесків за квартиру {{apartment}}, особовий рахунок {{account}}, за {{period}}";
  }

  return normalized;
}

function normalizeSnapshot(value: Partial<HouseRequisitesSnapshot> | null | undefined): RequisitesSnapshot {
  return {
    recipient: toSafeString(value?.recipient).trim(),
    iban: toSafeString(value?.iban).trim(),
    edrpou: toSafeString(value?.edrpou).trim(),
    bank: toSafeString(value?.bank).trim(),
    purposeTemplate:
      normalizeLegacyPurposeTemplate(value?.purposeTemplate) ||
      DEFAULT_SNAPSHOT.purposeTemplate,
    paymentUrl: toSafeString(value?.paymentUrl).trim(),
    paymentButtonLabel:
      toSafeString(value?.paymentButtonLabel).trim() || DEFAULT_SNAPSHOT.paymentButtonLabel,
  };
}

export function HouseRequisitesWorkspace({
  houseId,
  requisites,
  readOnlyMode,
}: Props) {
  const { dispatch, isPending } = useAdminContentCommand();

  const initialSnapshot = useMemo(
    () => normalizeSnapshot(requisites),
    [requisites],
  );

  const [snapshot, setSnapshot] = useState<RequisitesSnapshot>(initialSnapshot);
  const [lockVersion, setLockVersion] = useState(requisites.lockVersion);
  const [isEditing, setIsEditing] = useState(false);

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
    if (readOnlyMode) return;
    setIsEditing(true);
  }

  function handleCloseEditing() {
    setSnapshot(initialSnapshot);
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await dispatch<HouseRequisitesSnapshot>(
      {
        type: "requisites.save",
        houseId,
        payload: {
          lockVersion,
          recipient: snapshot.recipient,
          iban: snapshot.iban,
          edrpou: snapshot.edrpou,
          bank: snapshot.bank,
          purposeTemplate: snapshot.purposeTemplate,
          paymentUrl: snapshot.paymentUrl,
          paymentButtonLabel: snapshot.paymentButtonLabel,
        },
      },
      {
        onSuccess(data) {
          const saved = data as HouseRequisitesSnapshot;
          setLockVersion(saved.lockVersion);
          setSnapshot(normalizeSnapshot(saved));
          setIsEditing(false);
        },
      },
    );

    if (result) {
      setIsEditing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Реквізити
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cms-text-muted)]">
                Банківські реквізити та дані для оплати, які мешканці бачать на сайті будинку.
              </p>
            </div>

            {!readOnlyMode ? (
              <Button type="button" variant="secondary" onClick={handleOpenSettings}>
                Редагувати
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Отримувач", snapshot.recipient || "—"],
              ["IBAN", snapshot.iban || "—"],
              ["ЕДРПОУ", snapshot.edrpou || "—"],
              ["Банк", snapshot.bank || "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                  {label}
                </div>
                <div className="mt-2 break-words text-sm font-semibold text-[var(--cms-text)]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
              Призначення платежу
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--cms-text)]">
              {snapshot.purposeTemplate || "—"}
            </div>
          </div>

          <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
              Онлайн-оплата
            </div>
            <div className="mt-2 break-all text-sm text-[var(--cms-text)]">
              {snapshot.paymentUrl
                ? snapshot.paymentButtonLabel || "Перейти до оплати"
                : "Не підключена"}
            </div>
            {snapshot.paymentUrl ? (
              <div className="mt-1 break-all text-xs text-[var(--cms-text-muted)]">
                {snapshot.paymentUrl}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <AdminSidePanel
        title="Редагування реквізитів"
        description="Після збереження зміни одразу оновлять публічну сторінку будинку."
        isOpen={isEditing && !readOnlyMode}
        onClose={handleCloseEditing}
        maxWidthClassName="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                Банківські дані
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
                Основні реквізити
              </h3>
            </div>

            <FormField label="Отримувач платежу" required>
              <Input
                value={snapshot.recipient}
                onChange={(event) => updateField("recipient", event.target.value)}
                placeholder="ОСББ Чарівна 123А"
              />
            </FormField>

            <FormField
              label="IBAN для копіювання"
              required
              error={
                !ibanValid
                  ? "Введіть коректний український IBAN у форматі UA + 27 цифр."
                  : undefined
              }
            >
              <Input
                value={snapshot.iban}
                onChange={(event) =>
                  updateField("iban", normalizeIban(event.target.value))
                }
                placeholder="UA123456789012345678901234567"
                invalid={!ibanValid}
              />
            </FormField>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="ЕДРПОУ" required>
                <Input
                  value={snapshot.edrpou}
                  onChange={(event) => updateField("edrpou", event.target.value)}
                  placeholder="12345678"
                />
              </FormField>

              <FormField label="Банк отримувача" required>
                <Input
                  value={snapshot.bank}
                  onChange={(event) => updateField("bank", event.target.value)}
                  placeholder="ПриватБанк"
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-5 border-t border-[var(--cms-border)] pt-7">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                Платіж
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
                Призначення платежу
              </h3>
            </div>

            <FormField
              label="Шаблон призначення"
              hint="Цей текст буде показано мешканцю на сторінці оплати."
              required
            >
              <textarea
                value={snapshot.purposeTemplate}
                onChange={(event) =>
                  updateField("purposeTemplate", event.target.value)
                }
                rows={5}
                className={adminTextareaClass}
              />
            </FormField>
          </section>

          <section className="space-y-5 border-t border-[var(--cms-border)] pt-7">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                Додатково
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
                Онлайн-оплата
              </h3>
            </div>

            <FormField label="Посилання на оплату">
              <Input
                type="url"
                value={snapshot.paymentUrl}
                onChange={(event) => updateField("paymentUrl", event.target.value)}
                placeholder="https://example.com/pay"
              />
            </FormField>

            <FormField label="Текст кнопки">
              <Input
                value={snapshot.paymentButtonLabel}
                onChange={(event) =>
                  updateField("paymentButtonLabel", event.target.value)
                }
                placeholder="Перейти до оплати"
              />
            </FormField>
          </section>

          <section className="space-y-4 border-t border-[var(--cms-border)] pt-7">
            <div className="text-sm font-semibold text-[var(--cms-text)]">
              Попередній перегляд
            </div>

            <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 text-sm text-[var(--cms-text)]">
              <div className="space-y-3">
                <div><span className="text-[var(--cms-text-muted)]">Отримувач:</span> {snapshot.recipient || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">IBAN:</span> {snapshot.iban || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">ЕДРПОУ:</span> {snapshot.edrpou || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">Банк:</span> {snapshot.bank || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">Призначення платежу:</span> {snapshot.purposeTemplate || "—"}</div>
                <div><span className="text-[var(--cms-text-muted)]">Онлайн-оплата:</span> {snapshot.paymentUrl ? (snapshot.paymentButtonLabel || "Перейти до оплати") : "Не підключена"}</div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--cms-border)] pt-6">
            <Button
              type="submit" title="Зберегти (Ctrl/Cmd+Enter)"
              disabled={isPending || !isDirty || !publishReady}
              loading={isPending}
            >
              Зберегти
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseEditing}
              disabled={isPending}
            >
              Скасувати
            </Button>

            <div className="min-w-0 flex-1" />

            <Button
              type="button"
              variant="ghost"
              onClick={() => setSnapshot(DEFAULT_SNAPSHOT)}
              disabled={isPending}
            >
              Скинути
            </Button>
          </div>
        </form>
      </AdminSidePanel>
    </div>
  );
}
