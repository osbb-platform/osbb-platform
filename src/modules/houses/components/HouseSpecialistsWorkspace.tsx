"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import type { HouseSpecialistContactRequestRecord } from "@/src/modules/houses/services/getHouseSpecialistContactRequests";

const initialState = {
  error: null,
};

const SPECIALIST_CATEGORIES = [
  "Сантехнік",
  "Електрик",
  "Аварійна служба",
  "Прибирання / обслуговування",
  "Керуюча компанія",
] as const;

type SectionStatus = "draft" | "in_review" | "published" | "archived";
type SpecialistStatus = "active" | "draft" | "archived";
type WorkspaceTab = "active" | "draft" | "archive";
type WorkspaceMode = "idle" | "create" | "edit";

type SpecialistItem = {
  id: string;
  title: string;
  categories: string[];
  phone: string;
  officeHours: string;
  isPinned: boolean;
  status: SpecialistStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type SpecialistDraft = {
  id: string;
  title: string;
  categories: string[];
  phone: string;
  officeHours: string;
  isPinned: boolean;
  status: SpecialistStatus;
};

type Props = {
  houseId: string;
  houseSlug: string;
  section: {
    id: string;
    title: string | null;
    status: SectionStatus;
    content: Record<string, unknown>;
  };
  requests: HouseSpecialistContactRequestRecord[];
};

function createSpecialistId() {
  return `specialist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatPhoneMask(value: string) {
  const digits = value.replace(/\D/g, "");

  let normalized = digits;

  if (normalized.startsWith("380")) {
    normalized = normalized.slice(0, 12);
  } else if (normalized.startsWith("0")) {
    normalized = `38${normalized}`.slice(0, 12);
  } else if (!normalized.startsWith("38")) {
    normalized = `380${normalized}`.slice(0, 12);
  } else {
    normalized = normalized.slice(0, 12);
  }

  const cc = normalized.slice(0, 3);
  const p1 = normalized.slice(3, 5);
  const p2 = normalized.slice(5, 8);
  const p3 = normalized.slice(8, 10);
  const p4 = normalized.slice(10, 12);

  let result = `+${cc}`;

  if (p1) result += ` ${p1}`;
  if (p2) result += ` ${p2}`;
  if (p3) result += ` ${p3}`;
  if (p4) result += ` ${p4}`;

  return result.trim();
}

function createEmptyDraft(): SpecialistDraft {
  return {
    id: createSpecialistId(),
    title: "",
    categories: [],
    phone: "",
    officeHours: "",
    isPinned: false,
    status: "draft",
  };
}

function normalizeCategories(value: unknown) {
  const legacyCategoryMap: Record<string, string> = {
    "Сантехник": "Сантехнік",
    "Электрик": "Електрик",
    "Аварийная служба": "Аварійна служба",
    "Прибирання / обслуговування": "Прибирання / обслуговування",
    "Управляющая компания": "Керуюча компанія",
  };

  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => legacyCategoryMap[String(item ?? "").trim()] ?? String(item ?? "").trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function normalizeLegacySpecialists(
  content: Record<string, unknown>,
): SpecialistItem[] {
  if (Array.isArray(content.specialists)) {
    return (content.specialists as Array<Record<string, unknown>>)
      .map((item, index) => {
        const title = String(item.title ?? item.label ?? "").trim();
        const categories = normalizeCategories(item.categories);
        const category =
          categories.length > 0
            ? categories
            : typeof item.category === "string" && item.category.trim()
              ? [item.category.trim()]
              : [];

        const createdAt =
          typeof item.createdAt === "string" && item.createdAt
            ? item.createdAt
            : new Date(Date.now() - index * 1000).toISOString();

        const updatedAt =
          typeof item.updatedAt === "string" && item.updatedAt
            ? item.updatedAt
            : createdAt;

        const status =
          item.status === "active" ||
          item.status === "draft" ||
          item.status === "archived"
            ? item.status
            : "draft";

        return {
          id:
            typeof item.id === "string" && item.id.trim()
              ? item.id.trim()
              : createSpecialistId(),
          title,
          categories: category,
          phone: String(item.phone ?? "").trim(),
          officeHours: String(item.officeHours ?? "").trim(),
          isPinned: Boolean(item.isPinned),
          status,
          createdAt,
          updatedAt,
          archivedAt:
            typeof item.archivedAt === "string" && item.archivedAt
              ? item.archivedAt
              : null,
        } satisfies SpecialistItem;
      })
      .filter((item) => item.title || item.categories.length > 0 || item.phone);
  }

  const legacyCategories = Array.isArray(content.categories)
    ? (content.categories as Array<Record<string, unknown>>)
    : [];

  return legacyCategories.flatMap((category, categoryIndex) => {
    const categoryName = String(category.name ?? "").trim();
    const items = Array.isArray(category.items)
      ? (category.items as Array<Record<string, unknown>>)
      : [];

    return items
      .map((item, itemIndex) => {
        const title = String(item.label ?? "").trim();
        const createdAt = new Date(
          Date.now() - (categoryIndex * 100 + itemIndex) * 1000,
        ).toISOString();

        return {
          id: createSpecialistId(),
          title,
          categories: categoryName ? [categoryName] : [],
          phone: "",
          officeHours: "",
          isPinned: false,
          status: "active" as const,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        };
      })
      .filter((item) => item.title);
  });
}

function getSortTime(item: SpecialistItem) {
  const time = new Date(item.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortSpecialists(items: SpecialistItem[]) {
  return [...items].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return Number(right.isPinned) - Number(left.isPinned);
    }

    const timeDiff = getSortTime(right) - getSortTime(left);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.title.localeCompare(right.title, "uk");
  });
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не вказана";
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRequestPreview(request: HouseSpecialistContactRequestRecord) {
  const subject = request.subject?.trim();
  if (subject) return subject;

  const comment = request.comment?.trim();
  if (!comment) return "Без теми";

  return comment.length > 120 ? `${comment.slice(0, 120).trim()}…` : comment;
}

function getStatusLabel(status: SpecialistStatus) {
  if (status === "active") return "Активна";
  if (status === "archived") return "Архів";
  return "Чернетка";
}

export function HouseSpecialistsWorkspace({
  houseId,
  houseSlug,
  section,
  requests,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const initialSpecialists = useMemo(
    () => sortSpecialists(normalizeLegacySpecialists(section.content)),
    [section.content],
  );

  const [specialists, setSpecialists] =
    useState<SpecialistItem[]>(initialSpecialists);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [draft, setDraft] = useState<SpecialistDraft | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "delete" | "publish" | "archive" | null
  >(null);
  const [submitNonce, setSubmitNonce] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (submitNonce > 0 && formRef.current) {
      formRef.current.requestSubmit();
    }
  }, [submitNonce]);

  const activeItems = useMemo(
    () => sortSpecialists(specialists.filter((item) => item.status === "active")),
    [specialists],
  );

  const draftItems = useMemo(
    () => sortSpecialists(specialists.filter((item) => item.status === "draft")),
    [specialists],
  );

  const archivedItems = useMemo(
    () =>
      sortSpecialists(specialists.filter((item) => item.status === "archived")),
    [specialists],
  );

  const visibleSpecialists =
    activeTab === "active"
      ? activeItems
      : activeTab === "draft"
        ? draftItems
        : archivedItems;

  const serializedPayload = JSON.stringify({
    categoriesCatalog: [...SPECIALIST_CATEGORIES],
    specialists: specialists.map((item) => ({
      id: item.id,
      title: item.title,
      categories: item.categories,
      phone: item.phone,
      officeHours: item.officeHours,
      isPinned: item.isPinned,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      archivedAt: item.archivedAt,
    })),
    updatedAt: new Date().toISOString(),
  });

  function triggerSubmit() {
    setSubmitNonce((prev) => prev + 1);
  }

  function closeWorkspace() {
    setWorkspaceMode("idle");
    setDraft(null);
  }

  function openCreateMode() {
    setActiveTab("draft");
    setWorkspaceMode("create");
    setDraft(createEmptyDraft());
  }

  function openEditMode(itemId: string) {
    const item = specialists.find((specialist) => specialist.id === itemId);
    if (!item) return;

    setWorkspaceMode("edit");
    setDraft({
      id: item.id,
      title: item.title,
      categories: item.categories,
      phone: item.phone,
      officeHours: item.officeHours,
      isPinned: item.isPinned,
      status: item.status,
    });
  }

  function persistItems(nextItems: SpecialistItem[]) {
    setSpecialists(sortSpecialists(nextItems));
    triggerSubmit();
  }

  function handleDraftChange(
    field: keyof SpecialistDraft,
    value: string | boolean | string[],
  ) {
    setDraft((prev) => {
      if (!prev) return prev;

      if (field === "phone" && typeof value === "string") {
        return {
          ...prev,
          phone: formatPhoneMask(value),
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  }

  function handleCategoryToggle(category: string) {
    setDraft((prev) => {
      if (!prev) return prev;

      const hasCategory = prev.categories.includes(category);

      return {
        ...prev,
        categories: hasCategory
          ? prev.categories.filter((item) => item !== category)
          : [...prev.categories, category],
      };
    });
  }

  function handleSaveDraft() {
    if (!draft) return;

    const trimmedTitle = draft.title.trim();
    const trimmedPhone = draft.phone.trim();
    const trimmedOfficeHours = draft.officeHours.trim();
    const normalizedCategories = draft.categories.filter(Boolean);

    if (!trimmedTitle) {
      window.alert("Вкажіть ім’я та прізвище або назву компанії.");
      return;
    }

    if (normalizedCategories.length === 0) {
      window.alert("Оберіть хоча б одну категорію.");
      return;
    }

    if (trimmedPhone && trimmedPhone.replace(/\D/g, "").length < 12) {
      window.alert("Введіть телефон в українському форматі.");
      return;
    }

    const now = new Date().toISOString();
    const existingItem = specialists.find((item) => item.id === draft.id);

    const nextItem: SpecialistItem = {
      id: draft.id,
      title: trimmedTitle,
      categories: normalizedCategories,
      phone: trimmedPhone,
      officeHours: trimmedOfficeHours,
      isPinned: draft.isPinned,
      status: existingItem?.status ?? "draft",
      createdAt: existingItem?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existingItem?.archivedAt ?? null,
    };

    const nextItems = existingItem
      ? specialists.map((item) => (item.id === draft.id ? nextItem : item))
      : [...specialists, nextItem];

    closeWorkspace();
    persistItems(nextItems);
  }

  function handleConfirmItem(itemId: string) {
    const nextItems = specialists.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: "active" as const,
            archivedAt: null,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );

    closeWorkspace();
    persistItems(nextItems);
  }

  function handleArchiveItem(itemId: string) {
    const nextItems = specialists.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: "archived" as const,
            archivedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : item,
    );

    closeWorkspace();
    persistItems(nextItems);
  }

  function handleDeleteItem(itemId: string) {
    const target = specialists.find((item) => item.id === itemId);
    if (!target) return;

    const nextItems = specialists.filter((item) => item.id !== itemId);
    closeWorkspace();
    persistItems(nextItems);
  }

  function handleRestoreItem(itemId: string) {
    const nextItems = specialists.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: "active" as const,
            archivedAt: null,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );

    closeWorkspace();
    persistItems(nextItems);
  }

  function handleDeleteArchivedItem(itemId: string) {
    const target = specialists.find((item) => item.id === itemId);
    if (!target || target.status !== "archived") {
      window.alert("Видаляти можна лише картки з архіву.");
      return;
    }

    const nextItems = specialists.filter((item) => item.id !== itemId);
    closeWorkspace();
    persistItems(nextItems);
  }

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader active={isPending} delayMs={280} label="Оновлюємо картки спеціалістів..." className="rounded-3xl" />
      <form ref={formRef} action={formAction} className="space-y-6">
        <input type="hidden" name="sectionId" value={section.id} />
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="kind" value="specialists" />
        <input type="hidden" name="title" value={section.title ?? "Спеціалісти"} />
        <input type="hidden" name="status" value={section.status} />
        <input type="hidden" name="specialistsPayload" value={serializedPayload} />

        <div className={`${adminSurfaceClass} p-6`}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--cms-text)]">Спеціалісти</h2>
                <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                  Керування картками спеціалістів і публікацією карток на сайт будинку.
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

            <div className="flex flex-wrap gap-3">
            {[
              ["active", "Активні", activeItems.length],
              ["draft", "Чернетки", draftItems.length],
              ["archive", "Архів", archivedItems.length],
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
                  Картка зберігається всередину секції та одразу потрапляє в чернетки.
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

            <div className="grid gap-6">
              <div className="grid gap-4">
                <div>
                  <label className={`mb-2 block ${adminTextLabelClass}`}>
                    Ім’я та прізвище / Компанія
                  </label>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      handleDraftChange("title", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="Наприклад: Іван Петренко або Аварком сервіс"
                  />
                </div>

                <div>
                  <label className={`mb-2 block ${adminTextLabelClass}`}>
                    Категорії
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {SPECIALIST_CATEGORIES.map((category) => {
                      const isSelected = draft.categories.includes(category);

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleCategoryToggle(category)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                              : "border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={`mb-2 block ${adminTextLabelClass}`}>
                    Телефон
                  </label>
                  <input
                    value={draft.phone}
                    onChange={(event) =>
                      handleDraftChange("phone", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="+380 67 123 45 67"
                  />
                  <div className="mt-2 text-xs text-[var(--cms-text-soft)]">
                    Якщо телефон заповнений, на сайті будинку буде кнопка «Подзвонити».
                    Якщо ні — кнопка «Залишити заявку».
                  </div>
                </div>

                <div>
                  <label className={`mb-2 block ${adminTextLabelClass}`}>
                    Години прийому
                  </label>
                  <input
                    value={draft.officeHours}
                    onChange={(event) =>
                      handleDraftChange("officeHours", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="Пн–Пт, 09:00–18:00"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)]">
                    <input
                      type="checkbox"
                      checked={draft.isPinned}
                      onChange={(event) =>
                        handleDraftChange("isPinned", event.target.checked)
                      }
                    />
                    Закріпити зверху
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-[var(--cms-border)] pt-5">
                <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
                  <div className="flex flex-nowrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className={adminPrimaryButtonClass}
                    >
                      Зберегти
                    </button>

                    {workspaceMode === "edit" &&
                    (draft.status === "draft" || draft.status === "archived") ? (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("delete")}
                        className="inline-flex items-center justify-center rounded-3xl border border-[var(--cms-danger-border)] px-8 py-4 text-base font-medium text-[var(--cms-danger-text)] transition hover:opacity-90"
                      >
                        Видалити
                      </button>
                    ) : null}
                  </div>

                  {workspaceMode === "edit" && draft.status === "draft" ? (
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setConfirmAction("publish")}
                        className="inline-flex items-center justify-center rounded-3xl bg-[var(--cms-success-bg)] border border-[var(--cms-success-border)] px-8 py-4 text-base font-medium text-white transition hover:opacity-90"
                      >
                        Підтвердити
                      </button>
                    </div>
                  ) : null}

                  {workspaceMode === "edit" && draft.status === "active" ? (
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setConfirmAction("archive")}
                        className="inline-flex items-center justify-center rounded-3xl border border-[var(--cms-warning-border)] px-8 py-4 text-base font-medium text-[var(--cms-warning-text)] transition hover:opacity-90"
                      >
                        Архівувати
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>            </div>
          </div>
        ) : null}
        <div className={`${adminSurfaceClass} p-6`}>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleSpecialists.length > 0 ? (
                visibleSpecialists.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openEditMode(item.id)}
                    className="block w-full rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-3.5 text-left transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
                            {getStatusLabel(item.status)}
                          </span>

                          {item.isPinned ? (
                            <span className="inline-flex rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text)]">
                              Закріплено зверху
                            </span>
                          ) : null}

                          {item.categories.map((category) => (
                            <span
                              key={`${item.id}-${category}`}
                              className="inline-flex rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]"
                            >
                              {category}
                            </span>
                          ))}
                        </div>

                        <div className="text-lg font-semibold text-[var(--cms-text)]">
                          {item.title || "Без назви"}
                        </div>

                        <div className="mt-3 grid gap-1.5 text-sm leading-6 text-[var(--cms-text)] sm:grid-cols-[140px_1fr]">
                          <div className="text-[var(--cms-text-soft)]">Телефон</div>
                          <div>
                            {item.phone
                              ? item.phone
                              : "Телефон не вказано — на сайті буде кнопка «Залишити заявку»"}
                          </div>

                          <div className="text-[var(--cms-text-soft)]">Години зв’язку</div>
                          <div>{item.officeHours || "Години прийому не вказані"}</div>
                        </div>
                      </div>

                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-6 py-8 text-base leading-7 text-[var(--cms-text)]">
                  {activeTab === "active"
                    ? "Поки немає опублікованих спеціалістів. Створіть першу картку та підтвердьте публікацію."
                    : activeTab === "draft"
                      ? "Збережені чернетки спеціалістів з’являтимуться тут після створення або редагування."
                      : "Архів поки порожній. Зняті з публікації картки спеціалістів відображатимуться тут."}
                </div>
              )}
            </div>
          </div>

        {state.error ? (
          <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {state.error}
          </div>
        ) : null}

      
        <PlatformConfirmModal
          open={confirmAction === "delete"}
          title="Видалити картку спеціаліста?"
          description="Картку буде видалено з розділу спеціалістів без можливості відновлення."
          confirmLabel="Видалити"
          cancelLabel="Скасувати"
          tone="destructive"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (draft) handleDeleteItem(draft.id);
            setConfirmAction(null);
          }}
        />

        <PlatformConfirmModal
          open={confirmAction === "publish"}
          title="Підтвердити картку спеціаліста?"
          description="Після підтвердження картка з’явиться в активних спеціалістах на сайті будинку."
          confirmLabel="Підтвердити"
          cancelLabel="Скасувати"
          tone="publish"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (draft) handleConfirmItem(draft.id);
            setConfirmAction(null);
          }}
        />

        <PlatformConfirmModal
          open={confirmAction === "archive"}
          title="Архівувати картку?"
          description="Картку буде знято з публікації та переміщено в архів."
          confirmLabel="Архівувати"
          cancelLabel="Скасувати"
          tone="warning"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (draft) handleArchiveItem(draft.id);
            setConfirmAction(null);
          }}
        />
</form>
    </div>
  );
}
