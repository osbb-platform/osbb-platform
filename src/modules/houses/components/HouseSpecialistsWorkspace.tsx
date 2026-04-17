"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import type { HouseSpecialistContactRequestRecord } from "@/src/modules/houses/services/getHouseSpecialistContactRequests";

const initialState = {
  error: null,
};

const SPECIALIST_CATEGORIES = [
  "Сантехник",
  "Электрик",
  "Аварийная служба",
  "Уборка / обслуживание",
  "Управляющая компания",
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
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => String(item ?? "").trim())
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
    return "Дата не указана";
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
  if (!comment) return "Без темы";

  return comment.length > 120 ? `${comment.slice(0, 120).trim()}…` : comment;
}

function getStatusLabel(status: SpecialistStatus) {
  if (status === "active") return "Активный";
  if (status === "archived") return "Архив";
  return "Черновик";
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
      window.alert("Укажите имя и фамилию или название компании.");
      return;
    }

    if (normalizedCategories.length === 0) {
      window.alert("Выберите хотя бы одну категорию.");
      return;
    }

    if (trimmedPhone && trimmedPhone.replace(/\D/g, "").length < 12) {
      window.alert("Введите телефон в украинском формате.");
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
      window.alert("Удалять можно только карточки из архива.");
      return;
    }

    const nextItems = specialists.filter((item) => item.id !== itemId);
    closeWorkspace();
    persistItems(nextItems);
  }

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader active={isPending} delayMs={280} label="Обновляем карточки специалистов..." className="rounded-3xl" />
      <form ref={formRef} action={formAction} className="space-y-6">
        <input type="hidden" name="sectionId" value={section.id} />
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="kind" value="specialists" />
        <input type="hidden" name="title" value={section.title ?? "Специалисты"} />
        <input type="hidden" name="status" value={section.status} />
        <input type="hidden" name="specialistsPayload" value={serializedPayload} />

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Специалисты</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Управление карточками специалистов и публикацией карточек на сайт дома.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateMode}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
              >
                Создать специалиста
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
            {[
              ["active", "Активные", activeItems.length],
              ["draft", "Черновики", draftItems.length],
              ["archive", "Архив", archivedItems.length],
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
                      ? "bg-white text-slate-950"
                      : "border border-slate-700 bg-slate-950/40 text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-slate-200 text-slate-950"
                        : "bg-slate-800 text-slate-200"
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
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">
                  {workspaceMode === "create"
                    ? "Новый специалист"
                    : "Редактирование специалиста"}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Карточка сохраняется внутрь секции и сразу попадает в черновики.
                </div>
              </div>

              <button
                type="button"
                onClick={closeWorkspace}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
                aria-label="Закрыть форму"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Имя и фамилия / Компания
                  </label>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      handleDraftChange("title", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                    placeholder="Например: Иван Петренко или Аварком сервис"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Категории
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
                              ? "bg-white text-slate-950"
                              : "border border-slate-700 bg-slate-950/40 text-white"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Телефон
                  </label>
                  <input
                    value={draft.phone}
                    onChange={(event) =>
                      handleDraftChange("phone", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                    placeholder="+380 67 123 45 67"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Если телефон заполнен, на сайте дома будет кнопка «Позвонить».
                    Если нет — кнопка «Оставить заявку».
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Часы приема
                  </label>
                  <input
                    value={draft.officeHours}
                    onChange={(event) =>
                      handleDraftChange("officeHours", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                    placeholder="Пн–Пт, 09:00–18:00"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={draft.isPinned}
                      onChange={(event) =>
                        handleDraftChange("isPinned", event.target.checked)
                      }
                    />
                    Закрепить сверху
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-slate-800 pt-5">
                <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
                  <div className="flex flex-nowrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="inline-flex items-center justify-center rounded-3xl bg-white px-8 py-4 text-base font-medium text-slate-950 transition hover:bg-slate-200"
                    >
                      Сохранить
                    </button>

                    {workspaceMode === "edit" &&
                    (draft.status === "draft" || draft.status === "archived") ? (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("delete")}
                        className="inline-flex items-center justify-center rounded-3xl border border-red-900 px-8 py-4 text-base font-medium text-red-300 transition hover:bg-red-950/40"
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>

                  {workspaceMode === "edit" && draft.status === "draft" ? (
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setConfirmAction("publish")}
                        className="inline-flex items-center justify-center rounded-3xl bg-emerald-500 px-8 py-4 text-base font-medium text-white transition hover:bg-emerald-400"
                      >
                        Подтвердить
                      </button>
                    </div>
                  ) : null}

                  {workspaceMode === "edit" && draft.status === "active" ? (
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setConfirmAction("archive")}
                        className="inline-flex items-center justify-center rounded-3xl border border-amber-700 px-8 py-4 text-base font-medium text-amber-300 transition hover:bg-amber-950/30"
                      >
                        Архивировать
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>            </div>
          </div>
        ) : null}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {visibleSpecialists.length > 0 ? (
                visibleSpecialists.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openEditMode(item.id)}
                    className="block w-full rounded-3xl border border-slate-800 bg-slate-950/40 p-3.5 text-left transition hover:border-slate-700 hover:bg-slate-950/70"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300">
                            {getStatusLabel(item.status)}
                          </span>

                          {item.isPinned ? (
                            <span className="inline-flex rounded-full border border-blue-900 bg-blue-950/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-blue-300">
                              Закреплен сверху
                            </span>
                          ) : null}

                          {item.categories.map((category) => (
                            <span
                              key={`${item.id}-${category}`}
                              className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300"
                            >
                              {category}
                            </span>
                          ))}
                        </div>

                        <div className="text-lg font-semibold text-white">
                          {item.title || "Без названия"}
                        </div>

                        <div className="mt-3 grid gap-1.5 text-sm leading-6 text-slate-300 sm:grid-cols-[140px_1fr]">
                          <div className="text-slate-500">Телефон</div>
                          <div>
                            {item.phone
                              ? item.phone
                              : "Телефон не указан — на сайте будет кнопка «Оставить заявку»"}
                          </div>

                          <div className="text-slate-500">Часы связи</div>
                          <div>{item.officeHours || "Часы приема не указаны"}</div>
                        </div>
                      </div>

                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/30 px-6 py-8 text-base leading-7 text-slate-300">
                  {activeTab === "active"
                    ? "Пока нет опубликованных специалистов. Создайте первую карточку и подтвердите публикацию."
                    : activeTab === "draft"
                      ? "Сохраненные черновики специалистов будут появляться здесь после создания или редактирования."
                      : "Архив пока пуст. Снятые с публикации карточки специалистов будут отображаться здесь."}
                </div>
              )}
            </div>
          </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        ) : null}

      
        <PlatformConfirmModal
          open={confirmAction === "delete"}
          title="Удалить карточку специалиста?"
          description="Карточка будет удалена из раздела специалистов без возможности восстановления."
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          tone="destructive"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (draft) handleDeleteItem(draft.id);
            setConfirmAction(null);
          }}
        />

        <PlatformConfirmModal
          open={confirmAction === "publish"}
          title="Подтвердить карточку специалиста?"
          description="После подтверждения карточка появится в активных специалистах на сайте дома."
          confirmLabel="Подтвердить"
          cancelLabel="Отмена"
          tone="publish"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (draft) handleConfirmItem(draft.id);
            setConfirmAction(null);
          }}
        />

        <PlatformConfirmModal
          open={confirmAction === "archive"}
          title="Архивировать карточку?"
          description="Карточка будет снята с публикации и перемещена в архив."
          confirmLabel="Архивировать"
          cancelLabel="Отмена"
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
