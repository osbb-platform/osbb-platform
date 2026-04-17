"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";

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
    "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}",
  paymentUrl: "",
  paymentButtonLabel: "Перейти к оплате",
};

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);
  return /^UA\d{27}$/.test(iban);
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
      String(raw.purposeTemplate ?? DEFAULT_SNAPSHOT.purposeTemplate).trim() ||
      DEFAULT_SNAPSHOT.purposeTemplate,
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
  isReadOnly,
}: Props) {
  const readOnlyMode = Boolean(isReadOnly);
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
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Реквизиты</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Банковские реквизиты и данные для оплаты, которые жители видят на сайте дома.
                </p>
              </div>

              {!readOnlyMode ? (
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Редактировать
                </button>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6 text-white">
              <div className="space-y-3">
                <div><span className="text-slate-400">Получатель:</span> {snapshot.recipient || "—"}</div>
                <div><span className="text-slate-400">IBAN:</span> {snapshot.iban || "—"}</div>
                <div><span className="text-slate-400">ЕДРПОУ:</span> {snapshot.edrpou || "—"}</div>
                <div><span className="text-slate-400">Банк:</span> {snapshot.bank || "—"}</div>
                <div><span className="text-slate-400">Назначение платежа:</span> {snapshot.purposeTemplate || "—"}</div>
                <div className="break-words">
                  <span className="text-slate-400">Онлайн-оплата:</span>{" "}
                  <span className="break-all text-slate-200">
                    {snapshot.paymentUrl || "Не подключена"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="space-y-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Редактирование реквизитов
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    После сохранения изменения сразу обновят публичную страницу дома.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseEditing}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
                  aria-label="Закрыть форму"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    Получатель платежа
                  </div>
                  <input
                    value={snapshot.recipient}
                    onChange={(e) => updateField("recipient", e.target.value)}
                    placeholder="ОСББ Чарівна 123А"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-200">
                    IBAN для копирования
                  </div>
                  <input
                    value={snapshot.iban}
                    onChange={(e) => updateField("iban", normalizeIban(e.target.value))}
                    placeholder="UA123456789012345678901234567"
                    className={`w-full rounded-2xl border px-4 py-3 text-white ${
                      ibanValid
                        ? "border-slate-700 bg-slate-950"
                        : "border-red-500 bg-red-950/30"
                    }`}
                  />
                  {!ibanValid ? (
                    <div className="text-xs text-red-400">
                      Введите корректный украинский IBAN в формате UA + 27 цифр.
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    ЕДРПОУ
                  </div>
                  <input
                    value={snapshot.edrpou}
                    onChange={(e) => updateField("edrpou", e.target.value)}
                    placeholder="12345678"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    Банк получателя
                  </div>
                  <input
                    value={snapshot.bank}
                    onChange={(e) => updateField("bank", e.target.value)}
                    placeholder="ПриватБанк"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-200">
                Назначение платежа
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Это текст, который будет показан жителю на странице оплаты.
              </p>

              <textarea
                value={snapshot.purposeTemplate}
                onChange={(e) => updateField("purposeTemplate", e.target.value)}
                rows={4}
                placeholder="Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}"
                className="mt-5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-200">
                Дополнительная онлайн-оплата
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Необязательный блок. Если ссылка не указана, жители будут использовать только реквизиты выше.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  value={snapshot.paymentUrl}
                  onChange={(e) => updateField("paymentUrl", e.target.value)}
                  placeholder="https://example.com/pay"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
                <input
                  value={snapshot.paymentButtonLabel}
                  onChange={(e) => updateField("paymentButtonLabel", e.target.value)}
                  placeholder="Перейти к оплате"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-200">
                Preview страницы для жителя
              </div>

              <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-950 p-6 text-white">
                <div className="space-y-3">
                  <div><span className="text-slate-400">Получатель:</span> {snapshot.recipient || "—"}</div>
                  <div><span className="text-slate-400">IBAN:</span> {snapshot.iban || "—"}</div>
                  <div><span className="text-slate-400">ЕДРПОУ:</span> {snapshot.edrpou || "—"}</div>
                  <div><span className="text-slate-400">Банк:</span> {snapshot.bank || "—"}</div>
                  <div><span className="text-slate-400">Назначение платежа:</span> {snapshot.purposeTemplate || "—"}</div>
                  <div><span className="text-slate-400">Онлайн-оплата:</span> {snapshot.paymentUrl ? (snapshot.paymentButtonLabel || "Перейти к оплате") : "Не подключена"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <input type="hidden" name="houseId" value={houseId} />
              <input type="hidden" name="houseSlug" value={houseSlug} />
              <input type="hidden" name="sectionId" value={section?.id ?? ""} />
              <input type="hidden" name="title" value="Реквизиты" />
              <input type="hidden" name="kind" value="requisites" />
              <input type="hidden" name="status" value="published" />
              <input type="hidden" name="content" value={JSON.stringify(snapshot)} />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending || !isDirty || !publishReady}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Сохраняем..." : "Сохранить"}
                </button>

                <button
                  type="button"
                  onClick={() => setSnapshot(DEFAULT_SNAPSHOT)}
                  disabled={isPending}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Сбросить
                </button>
              </div>

              {state.error ? (
                <div className="mt-4 text-sm text-red-400">{state.error}</div>
              ) : null}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
