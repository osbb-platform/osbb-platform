"use client";

import { useMemo, useState } from "react";

import type { AdminContractorOption } from "@/src/modules/houses/services/getAdminContractors";
import { createAdminContractor } from "@/src/modules/houses/actions/createAdminContractor";
import { deactivateAdminContractor } from "@/src/modules/houses/actions/deactivateAdminContractor";
import {
  adminButtonClasses,
  adminInputClass,
} from "@/src/shared/ui/admin/adminStyles";

type ContractorValue = {
  contractor: string;
  contractorId: string | null;
};

type Props = {
  value: ContractorValue;
  options: AdminContractorOption[];
  disabled?: boolean;
  onChange: (value: ContractorValue) => void;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk-UA");
}

export function ContractorCombobox({
  value,
  options,
  disabled = false,
  onChange,
}: Props) {
  const [items, setItems] = useState(options);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] =
    useState<AdminContractorOption | null>(null);

  const query = value.contractor;
  const normalizedQuery = normalizeName(query);

  const filtered = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((item) =>
      normalizeName(item.name).includes(normalizedQuery),
    );
  }, [items, normalizedQuery]);

  const exactMatch = items.find(
    (item) => normalizeName(item.name) === normalizedQuery,
  );

  function applyText(nextText: string) {
    const nextNormalized = normalizeName(nextText);
    const nextExact = items.find(
      (item) => normalizeName(item.name) === nextNormalized,
    );

    onChange({
      contractor: nextText,
      contractorId: nextExact?.id ?? null,
    });
    setOpen(true);
    setError(null);
  }

  function selectContractor(item: AdminContractorOption) {
    onChange({
      contractor: item.name,
      contractorId: item.id,
    });
    setOpen(false);
    setError(null);
  }

  async function addFrequentContractor() {
    const name = query.trim().replace(/\s+/g, " ");

    if (!name) return;

    setBusy(true);
    setError(null);

    const result = await createAdminContractor(name);

    if (result.error || !result.data) {
      setError(result.error ?? "Не вдалося додати підрядника.");
      setBusy(false);
      return;
    }

    const created: AdminContractorOption = {
      id: result.data.id,
      name: result.data.name,
      cityId: result.data.cityId,
      isGlobal: false,
      canDeactivate: false,
    };

    setItems((current) =>
      [...current, created].sort((a, b) =>
        a.name.localeCompare(b.name, "uk"),
      ),
    );
    selectContractor(created);
    setBusy(false);
  }

  async function deactivateContractor() {
    if (!pendingDeactivate) return;

    setBusy(true);
    setError(null);

    const result = await deactivateAdminContractor(pendingDeactivate.id);

    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setItems((current) =>
      current.filter((item) => item.id !== pendingDeactivate.id),
    );

    if (value.contractorId === pendingDeactivate.id) {
      onChange({
        contractor: value.contractor,
        contractorId: null,
      });
    }

    setPendingDeactivate(null);
    setBusy(false);
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
        Підрядник
      </label>

      <input
        value={query}
        disabled={disabled || busy}
        onFocus={() => setOpen(true)}
        onChange={(event) => applyText(event.target.value)}
        placeholder="Оберіть зі списку або введіть довільну назву"
        className={adminInputClass}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="house-plan-contractor-options"
      />

      <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
        Частого підрядника можна обрати зі списку. Будь-яку іншу назву можна
        залишити як довільний текст.
      </div>

      {open ? (
        <div
          id="house-plan-contractor-options"
          className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-2 shadow-xl"
        >
          {filtered.length > 0 ? (
            <div className="space-y-1">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-[var(--r-md)] hover:bg-[var(--cms-surface-hover)]"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-[var(--cms-text)]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectContractor(item)}
                  >
                    <span className="block truncate">{item.name}</span>
                  </button>
                  {item.canDeactivate ? (
                    <button
                      type="button"
                      className="shrink-0 px-3 py-2 text-xs text-[var(--cms-danger-text)]"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setPendingDeactivate(item)}
                      aria-label={`Деактивувати ${item.name}`}
                    >
                      Деактивувати
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-[var(--cms-text-muted)]">
              У списку частих збігів немає.
            </div>
          )}

          {query.trim() && !exactMatch ? (
            <button
              type="button"
              disabled={busy}
              onMouseDown={(event) => event.preventDefault()}
              onClick={addFrequentContractor}
              className={`${adminButtonClasses({ variant: "secondary" })} mt-2 w-full`}
            >
              {busy ? "Додавання…" : `Додати «${query.trim()}» у часті`}
            </button>
          ) : null}

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen(false)}
            className="mt-2 w-full px-3 py-2 text-sm text-[var(--cms-text-muted)]"
          >
            Закрити список
          </button>
        </div>
      ) : null}

      {pendingDeactivate ? (
        <div className="mt-3 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-surface)] p-3">
          <div className="text-sm font-medium text-[var(--cms-danger-text)]">
            Деактивувати «{pendingDeactivate.name}»?
          </div>
          <p className="mt-1 text-xs text-[var(--cms-text-muted)]">
            Підрядник зникне зі списку частих. Історичні завдання та їх текст не
            будуть видалені або змінені.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={deactivateContractor}
              className={adminButtonClasses({ variant: "danger" })}
            >
              {busy ? "Деактивація…" : "Деактивувати"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPendingDeactivate(null)}
              className={adminButtonClasses({ variant: "secondary" })}
            >
              Скасувати
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-2 text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
