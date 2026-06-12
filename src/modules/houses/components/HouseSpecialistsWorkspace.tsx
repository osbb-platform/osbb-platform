"use client";

import { useMemo, useState } from "react";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseSpecialistContactRequestRecord } from "@/src/modules/houses/services/getHouseSpecialistContactRequests";
import type {
  AdminHouseSpecialistsSnapshot,
  HouseSpecialistSnapshot,
  HouseSpecialistsCategorySnapshot,
} from "@/src/modules/houses/services/getAdminHouseSpecialists";
import {
  adminDangerButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSuccessButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
  adminWarningButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

const DEFAULT_SPECIALIST_CATEGORIES = [
  "Сантехнік",
  "Електрик",
  "Аварійна служба",
  "Прибирання / обслуговування",
  "Керуюча компанія",
] as const;

type WorkspaceTab = "published" | "draft" | "archived";
type WorkspaceMode = "idle" | "create" | "edit";
type ConfirmAction = "delete" | "publish" | "archive" | "restore" | null;

type SpecialistDraft = {
  id: string | null;
  lockVersion: number | null;
  title: string;
  category: string;
  phones: string[];
  email: string;
  description: string;
  sortOrder: number;
  status: WorkspaceTab;
};

type Props = {
  houseId: string;
  specialistsData: AdminHouseSpecialistsSnapshot;
  requests: HouseSpecialistContactRequestRecord[];
};

function createEmptyDraft(sortOrder: number): SpecialistDraft {
  return {
    id: null,
    lockVersion: null,
    title: "",
    category: "",
    phones: [""],
    email: "",
    description: "",
    sortOrder,
    status: "draft",
  };
}

function formatPhoneMask(value: string) {
  const input = value.trim();

  if (!input) return "";

  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");

  if (!digits) return "";

  return hasPlus ? `+${digits.slice(0, 15)}` : digits.slice(0, 15);
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 5 && digits.length <= 15;
}

function normalizePhones(value: string[]) {
  return value
    .map((phone) => formatPhoneMask(phone))
    .filter(Boolean)
    .filter((phone, index, array) => array.indexOf(phone) === index);
}

function toDraft(item: HouseSpecialistSnapshot): SpecialistDraft {
  return {
    id: item.id,
    lockVersion: item.lockVersion,
    title: item.content.title,
    category: item.content.category,
    phones: item.content.phones.length > 0 ? item.content.phones : [""],
    email: item.content.email,
    description: item.content.description,
    sortOrder: item.content.sortOrder,
    status: item.status,
  };
}

function getStatusLabel(status: WorkspaceTab) {
  if (status === "published") return "Активна";
  if (status === "archived") return "Архів";
  return "Чернетка";
}

function sortSpecialists(items: HouseSpecialistSnapshot[]) {
  return [...items].sort((left, right) => {
    const sortDiff = left.content.sortOrder - right.content.sortOrder;
    if (sortDiff !== 0) return sortDiff;

    const rightTime = new Date(right.content.updatedAt).getTime();
    const leftTime = new Date(left.content.updatedAt).getTime();

    if (!Number.isNaN(rightTime) && !Number.isNaN(leftTime) && rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(right.title, "uk");
  });
}

function normalizeCategoryTitle(value: string) {
  return value.trim();
}

export function HouseSpecialistsWorkspace({
  houseId,
  specialistsData,
  requests,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("published");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [draft, setDraft] = useState<SpecialistDraft | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const fromCatalog = specialistsData.categories
      .map((category) => category.title)
      .filter(Boolean);

    const fromItems = specialistsData.specialists
      .map((item) => item.content.category)
      .filter(Boolean);

    return [...DEFAULT_SPECIALIST_CATEGORIES, ...fromCatalog, ...fromItems]
      .filter((title, index, array) => array.indexOf(title) === index);
  }, [specialistsData.categories, specialistsData.specialists]);

  const publishedItems = useMemo(
    () => sortSpecialists(specialistsData.specialists.filter((item) => item.status === "published")),
    [specialistsData.specialists],
  );

  const draftItems = useMemo(
    () => sortSpecialists(specialistsData.specialists.filter((item) => item.status === "draft")),
    [specialistsData.specialists],
  );

  const archivedItems = useMemo(
    () => sortSpecialists(specialistsData.specialists.filter((item) => item.status === "archived")),
    [specialistsData.specialists],
  );

  const visibleSpecialists =
    activeTab === "published"
      ? publishedItems
      : activeTab === "draft"
        ? draftItems
        : archivedItems;

  const nextSortOrder =
    specialistsData.specialists.reduce(
      (max, item) => Math.max(max, item.content.sortOrder),
      -1,
    ) + 1;

  function closeWorkspace() {
    setWorkspaceMode("idle");
    setDraft(null);
    setConfirmAction(null);
    setWorkspaceError(null);
  }

  function openCreateMode() {
    setWorkspaceError(null);
    setActiveTab("draft");
    setWorkspaceMode("create");
    setDraft(createEmptyDraft(nextSortOrder));
  }

  function openEditMode(item: HouseSpecialistSnapshot) {
    setWorkspaceError(null);
    setWorkspaceMode("edit");
    setDraft(toDraft(item));
  }

  function updateDraft(
    field: keyof SpecialistDraft,
    value: string | number | string[],
  ) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function handleDraftPhoneChange(index: number, value: string) {
    setDraft((current) => {
      if (!current) return current;

      const nextPhones = [...current.phones];
      nextPhones[index] = formatPhoneMask(value);

      return {
        ...current,
        phones: nextPhones,
      };
    });
  }

  function addDraftPhone() {
    setDraft((current) =>
      current
        ? {
            ...current,
            phones: [...current.phones, ""],
          }
        : current,
    );
  }

  function removeDraftPhone(index: number) {
    setDraft((current) => {
      if (!current) return current;

      const nextPhones = current.phones.filter((_, phoneIndex) => phoneIndex !== index);

      return {
        ...current,
        phones: nextPhones.length > 0 ? nextPhones : [""],
      };
    });
  }

  async function saveDraft() {
    if (!draft) return;

    const title = draft.title.trim();
    const category = draft.category.trim();
    const phones = normalizePhones(draft.phones);

    if (!title) {
      setWorkspaceError("Вкажіть ім’я та прізвище або назву компанії.");
      return;
    }

    if (!category) {
      setWorkspaceError("Оберіть категорію спеціаліста.");
      return;
    }

    const hasInvalidPhone = phones.some((phone) => !isValidPhone(phone));
    if (hasInvalidPhone) {
      setWorkspaceError("Введіть коректний номер телефону.");
      return;
    }

    setWorkspaceError(null);

    const payload = {
      title,
      category,
      phones,
      email: draft.email.trim(),
      description: draft.description.trim(),
      sortOrder: draft.sortOrder,
    };

    if (workspaceMode === "create") {
      const created = await dispatch({
        type: "specialists.create",
        houseId,
        payload,
      });

      if (created) {
        closeWorkspace();
        setActiveTab("draft");
      }

      return;
    }

    if (!draft.id || typeof draft.lockVersion !== "number") {
      setWorkspaceError("Не вдалося визначити картку спеціаліста для оновлення.");
      return;
    }

    const updated = await dispatch({
      type: "specialists.update",
      houseId,
      payload: {
        ...payload,
        id: draft.id,
        lockVersion: draft.lockVersion,
      },
    });

    if (updated) {
      closeWorkspace();
    }
  }

  async function runLifecycleCommand(action: Exclude<ConfirmAction, null>) {
    if (!draft?.id || typeof draft.lockVersion !== "number") return;

    const commandType =
      action === "publish"
        ? "specialists.publish"
        : action === "archive"
          ? "specialists.archive"
          : action === "restore"
            ? "specialists.restore"
            : "specialists.delete";

    const result = await dispatch({
      type: commandType,
      houseId,
      payload: {
        id: draft.id,
        lockVersion: draft.lockVersion,
      },
    });

    if (result) {
      closeWorkspace();

      if (action === "publish") setActiveTab("published");
      if (action === "archive") setActiveTab("archived");
      if (action === "restore") setActiveTab("draft");
    }
  }

  async function copySpecialistToDraft() {
    if (!draft?.id || draft.status === "draft") return;

    setWorkspaceError(null);

    const copied = await dispatch(
      {
        type: "specialists.duplicate",
        houseId,
        payload: {
          sourceId: draft.id,
          targetHouseIds: [houseId],
        },
      },
      {
        onError: setWorkspaceError,
      },
    );

    if (!copied) return;

    closeWorkspace();
    setActiveTab("draft");
  }

  async function saveCategories(nextCategories: HouseSpecialistsCategorySnapshot[]) {
    await dispatch({
      type: "specialists.categoriesUpsert",
      houseId,
      payload: {
        categories: nextCategories.map((category, index) => ({
          id: category.id,
          title: category.title,
          sortOrder: index,
        })),
      },
    });
  }

  async function addCategory() {
    const title = normalizeCategoryTitle(categoryDraft);

    if (!title) return;

    const exists = specialistsData.categories.some(
      (category) => category.title.toLowerCase() === title.toLowerCase(),
    );

    if (exists) {
      setCategoryDraft("");
      return;
    }

    await dispatch({
      type: "specialists.categoriesUpsert",
      houseId,
      payload: {
        categories: [
          ...specialistsData.categories.map((category, index) => ({
            id: category.id,
            title: category.title,
            sortOrder: index,
          })),
          {
            title,
            sortOrder: specialistsData.categories.length,
          },
        ],
      },
    });

    setCategoryDraft("");
  }

  async function removeCategory(categoryId: string) {
    const nextCategories = specialistsData.categories.filter(
      (category) => category.id !== categoryId,
    );

    await saveCategories(nextCategories);
  }

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label="Оновлюємо картки спеціалістів..."
        className="rounded-3xl"
      />

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Спеціалісти
              </h2>
              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Керування окремими картками спеціалістів, статусами публікації та каталогом категорій.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateMode}
              className={adminPrimaryButtonClass}
            >
              Створити спеціаліста
            </button>
          </div>

          <div className="grid gap-3 rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-sm text-[var(--cms-text)] md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--cms-text-soft)]">
                Активні заявки
              </div>
              <div className="mt-1 text-2xl font-semibold">{requests.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--cms-text-soft)]">
                Категорії
              </div>
              <div className="mt-1 text-2xl font-semibold">{specialistsData.categories.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--cms-text-soft)]">
                Всього карток
              </div>
              <div className="mt-1 text-2xl font-semibold">{specialistsData.specialists.length}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              ["published", "Активні", publishedItems.length],
              ["draft", "Чернетки", draftItems.length],
              ["archived", "Архів", archivedItems.length],
            ].map(([key, label, count]) => {
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key as WorkspaceTab);
                    closeWorkspace();
                  }}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                      : "border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)]"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-[var(--cms-tab-active-count-bg)] text-[var(--cms-tab-active-text)]"
                        : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--cms-text)]">
              Каталог категорій
            </h3>
            <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
              Категорії використовуються для фільтрів і вибору в картці спеціаліста.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {specialistsData.categories.length > 0 ? (
              specialistsData.categories.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-3 py-2 text-sm text-[var(--cms-text)]"
                >
                  {category.title}
                  <button
                    type="button"
                    onClick={() => removeCategory(category.id)}
                    className="text-[var(--cms-danger-text)]"
                    aria-label={`Видалити категорію ${category.title}`}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--cms-text-muted)]">
                Каталог поки порожній. Можна додати першу категорію нижче.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              className={adminInputClass}
              placeholder="Нова категорія"
            />
            <button
              type="button"
              onClick={addCategory}
              className={adminSecondaryButtonClass}
            >
              Додати категорію
            </button>
          </div>
        </div>
      </div>

      {workspaceMode !== "idle" && draft ? (
        <div className={`${adminSurfaceClass} p-6`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-[var(--cms-text)]">
                {workspaceMode === "create"
                  ? "Новий спеціаліст"
                  : "Редагування спеціаліста"}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                Нова картка зберігається як чернетка. Публікація виконується окремою командою.
              </div>
            </div>

            <button
              type="button"
              onClick={closeWorkspace}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] text-lg font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
              aria-label="Закрити форму"
            >
              ×
            </button>
          </div>

          {workspaceError ?? lastError ? (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
            >
              {workspaceError ?? lastError}
            </div>
          ) : null}

          <div className="grid gap-5">
            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Ім’я та прізвище / Компанія
              </label>
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                className={adminInputClass}
                placeholder="Наприклад: Іван Петренко або Аварком сервіс"
              />
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Категорія
              </label>
              <select
                value={draft.category}
                onChange={(event) => updateDraft("category", event.target.value)}
                className={adminInputClass}
              >
                <option value="">Оберіть категорію</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Телефони
              </label>

              <div className="grid gap-2">
                {draft.phones.map((phone, index) => (
                  <div key={`phone-${index}`} className="flex gap-2">
                    <input
                      value={phone}
                      onChange={(event) =>
                        handleDraftPhoneChange(index, event.target.value)
                      }
                      className={adminInputClass}
                      placeholder="+380 67 123 45 67 або 0800 00 00 00"
                    />

                    {draft.phones.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeDraftPhone(index)}
                        className={adminSecondaryButtonClass}
                      >
                        Видалити
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addDraftPhone}
                className="mt-3 inline-flex items-center rounded-2xl border border-[var(--cms-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)]"
              >
                + Додати ще телефон
              </button>

              <div className="mt-2 text-xs text-[var(--cms-text-soft)]">
                Якщо телефони не вказані, на сайті будинку буде кнопка «Залишити заявку».
              </div>
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Email
              </label>
              <input
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                className={adminInputClass}
                placeholder="specialist@example.com"
              />
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Опис / графік / примітки
              </label>
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                className={`${adminInputClass} min-h-[120px]`}
                placeholder="Опишіть, коли звертатися до спеціаліста, графік прийому або додаткові умови."
              />
            </div>

            <div>
              <label className={`mb-2 block ${adminTextLabelClass}`}>
                Порядок сортування
              </label>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) =>
                  updateDraft("sortOrder", Number.parseInt(event.target.value, 10) || 0)
                }
                className={adminInputClass}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cms-border)] pt-5">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveDraft}
                  className={adminPrimaryButtonClass}
                  disabled={isPending}
                >
                  Зберегти
                </button>

                <button
                  type="button"
                  onClick={closeWorkspace}
                  className={adminSecondaryButtonClass}
                  disabled={isPending}
                >
                  Скасувати
                </button>

                {workspaceMode === "edit" && draft.status !== "draft" ? (
                  <button
                    type="button"
                    onClick={() => void copySpecialistToDraft()}
                    className={adminSecondaryButtonClass}
                    disabled={isPending}
                  >
                    Копіювати в чернетку
                  </button>
                ) : null}

                {workspaceMode === "edit" ? (
                  <button
                    type="button"
                    onClick={() => setConfirmAction("delete")}
                    className={adminDangerButtonClass}
                    disabled={isPending}
                  >
                    Видалити
                  </button>
                ) : null}
              </div>

              {workspaceMode === "edit" && draft.status === "draft" ? (
                <button
                  type="button"
                  onClick={() => setConfirmAction("publish")}
                  className={adminSuccessButtonClass}
                  disabled={isPending}
                >
                  Опублікувати
                </button>
              ) : null}

              {workspaceMode === "edit" && draft.status === "published" ? (
                <button
                  type="button"
                  onClick={() => setConfirmAction("archive")}
                  className={adminWarningButtonClass}
                  disabled={isPending}
                >
                  Архівувати
                </button>
              ) : null}

              {workspaceMode === "edit" && draft.status === "archived" ? (
                <button
                  type="button"
                  onClick={() => setConfirmAction("restore")}
                  className={adminSecondaryButtonClass}
                  disabled={isPending}
                >
                  Відновити в чернетки
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleSpecialists.length > 0 ? (
            visibleSpecialists.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEditMode(item)}
                className="block w-full rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-left transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface)]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
                    {getStatusLabel(item.status)}
                  </span>

                  {item.content.category ? (
                    <span className="inline-flex rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
                      {item.content.category}
                    </span>
                  ) : null}
                </div>

                <div className="text-lg font-semibold text-[var(--cms-text)]">
                  {item.title || "Без назви"}
                </div>

                <div className="mt-3 grid gap-1.5 text-sm leading-6 text-[var(--cms-text)] sm:grid-cols-[140px_1fr]">
                  <div className="text-[var(--cms-text-soft)]">Телефон</div>
                  <div>
                    {item.content.phones.length > 0
                      ? item.content.phones.join(", ")
                      : "Телефон не вказано — на сайті буде кнопка «Залишити заявку»"}
                  </div>

                  <div className="text-[var(--cms-text-soft)]">Email</div>
                  <div>{item.content.email || "Email не вказано"}</div>

                  <div className="text-[var(--cms-text-soft)]">Опис</div>
                  <div>{item.content.description || "Опис не вказано"}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-6 py-8 text-base leading-7 text-[var(--cms-text)]">
              {activeTab === "published"
                ? "Поки немає опублікованих спеціалістів. Створіть першу картку та опублікуйте її."
                : activeTab === "draft"
                  ? "Чернетки спеціалістів з’являтимуться тут після створення або відновлення з архіву."
                  : "Архів поки порожній. Зняті з публікації картки спеціалістів відображатимуться тут."}
            </div>
          )}
        </div>
      </div>

      {lastError ? (
        <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {lastError}
        </div>
      ) : null}

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title="Видалити картку спеціаліста?"
        description="Картку буде видалено без можливості відновлення."
        confirmLabel="Видалити"
        cancelLabel="Скасувати"
        tone="destructive"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => runLifecycleCommand("delete")}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Опублікувати картку спеціаліста?"
        description="Після публікації картка з’явиться на сайті будинку."
        confirmLabel="Опублікувати"
        cancelLabel="Скасувати"
        tone="publish"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => runLifecycleCommand("publish")}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Архівувати картку?"
        description="Картку буде знято з публікації та переміщено в архів."
        confirmLabel="Архівувати"
        cancelLabel="Скасувати"
        tone="warning"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => runLifecycleCommand("archive")}
      />

      <PlatformConfirmModal
        open={confirmAction === "restore"}
        title="Відновити картку?"
        description="Картку буде повернуто в чернетки для подальшого редагування."
        confirmLabel="Відновити"
        cancelLabel="Скасувати"
        tone="publish"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => runLifecycleCommand("restore")}
      />
    </div>
  );
}
