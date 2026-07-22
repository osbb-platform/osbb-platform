"use client";

import { useWorkspaceMemory } from "@/src/shared/hooks/useWorkspaceMemory";

import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import {
  AdminStatusBadge,
  statusLabelFor,
  statusToneFor,
} from "@/src/shared/ui/admin/AdminStatusBadge";
import { Button } from "@/src/shared/ui/admin/Button";
import { FormField } from "@/src/shared/ui/admin/FormField";
import { IconButton } from "@/src/shared/ui/admin/IconButton";
import { Input } from "@/src/shared/ui/admin/Input";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";
import {
  ContentTemplateSlotsPanel,
  type ContentTemplateSlot,
} from "@/src/modules/houses/components/ContentTemplateSlotsPanel";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";

import { useMemo, useState } from "react";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseSpecialistContactRequestRecord } from "@/src/modules/houses/services/getHouseSpecialistContactRequests";
import type {
  AdminHouseSpecialistsSnapshot,
  HouseSpecialistSnapshot,
} from "@/src/modules/houses/services/getAdminHouseSpecialists";
import {
  adminSelectClass,
  adminSurfaceClass,
  adminTextareaClass,
} from "@/src/shared/ui/admin/adminStyles";
import { TemplateIcon } from "@/src/shared/ui/icons/AdminInlineIcons";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";

const SPECIALISTS_TEMPLATE_SLOT_LIMIT = 10;

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
type SpecialistPhoneType = "mobile" | "landline" | "free";

const SPECIALIST_PHONE_TYPE_OPTIONS: Array<{ value: SpecialistPhoneType; label: string }> = [
  { value: "mobile", label: "Мобільний" },
  { value: "landline", label: "Міський" },
  { value: "free", label: "Безкоштовний 0-800" },
];

type SpecialistDraft = {
  id: string | null;
  lockVersion: number | null;
  title: string;
  category: string;
  phones: string[];
  phoneTypes: SpecialistPhoneType[];
  email: string;
  description: string;
  sortOrder: number;
  status: WorkspaceTab;
};

type Props = {
  houseId: string;
  specialistsData: AdminHouseSpecialistsSnapshot;
  requests: HouseSpecialistContactRequestRecord[];
  templates?: ContentTemplateSlot[];
  duplicateTargets?: CrossHouseDuplicateTarget[];
};

function createEmptyDraft(sortOrder: number): SpecialistDraft {
  return {
    id: null,
    lockVersion: null,
    title: "",
    category: "",
    phones: [""],
    phoneTypes: ["mobile"],
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

function normalizePhoneType(value: unknown): SpecialistPhoneType {
  return value === "landline" || value === "free" ? value : "mobile";
}

function normalizeDraftPhoneTypes(
  value: unknown,
  phones: string[],
): SpecialistPhoneType[] {
  const rawTypes = Array.isArray(value) ? value : [];

  return phones.map((_, index) => normalizePhoneType(rawTypes[index]));
}

function getPhoneTypeLabel(value: SpecialistPhoneType) {
  return SPECIALIST_PHONE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Мобільний";
}

function toDraft(item: HouseSpecialistSnapshot): SpecialistDraft {
  return {
    id: item.id,
    lockVersion: item.lockVersion,
    title: item.content.title,
    category: item.content.category,
    phones: item.content.phones.length > 0 ? item.content.phones : [""],
    phoneTypes: normalizeDraftPhoneTypes(
      item.content.phoneTypes,
      item.content.phones.length > 0 ? item.content.phones : [""],
    ),
    email: item.content.email,
    description: item.content.description,
    sortOrder: item.content.sortOrder,
    status: item.status,
  };
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


function findNextTemplateSlot(templates: ContentTemplateSlot[], slotLimit: number) {
  const usedSlots = new Set(templates.map((template) => template.slotIndex));

  for (let slotIndex = 1; slotIndex <= slotLimit; slotIndex += 1) {
    if (!usedSlots.has(slotIndex)) {
      return slotIndex;
    }
  }

  return null;
}

export function HouseSpecialistsWorkspace({
  houseId,
  specialistsData,
  templates = [],
  duplicateTargets = [],
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const [activeTab, setActiveTab] = useWorkspaceMemory<WorkspaceTab>(
    "specialists",
    "activeTab",
    "published",
    ["published", "draft", "archived"],
  );
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [draft, setDraft] = useState<SpecialistDraft | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState(false);

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
  async function applySpecialistsTemplateKeys(templateKeys: string[]) {
    setWorkspaceError(null);
    setApplyingTemplate(true);

    for (const templateKey of templateKeys) {
      const applied = await dispatch(
        {
          type: "specialists.applyTemplate",
          houseId,
          payload: {
            templateKey,
          },
        },
        {
          successMessage: null,
          onError: setWorkspaceError,
        },
      );

      if (!applied) {
        setApplyingTemplate(false);
        return false;
      }
    }

    setApplyingTemplate(false);
    setTemplatesPanelOpen(false);
    closeWorkspace();
    setActiveTab("draft");
    return true;
  }

  function updateDraft(
    field: keyof SpecialistDraft,
    value: string | number | string[] | SpecialistPhoneType[],
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

  function handleDraftPhoneTypeChange(index: number, value: SpecialistPhoneType) {
    setDraft((current) => {
      if (!current) return current;

      const nextPhoneTypes = normalizeDraftPhoneTypes(current.phoneTypes, current.phones);
      nextPhoneTypes[index] = value;

      return {
        ...current,
        phoneTypes: nextPhoneTypes,
      };
    });
  }

  function addDraftPhone() {
    setDraft((current) =>
      current
        ? {
            ...current,
            phones: [...current.phones, ""],
            phoneTypes: [...current.phoneTypes, "mobile"],
          }
        : current,
    );
  }

  function removeDraftPhone(index: number) {
    setDraft((current) => {
      if (!current) return current;

      const nextPhones = current.phones.filter((_, phoneIndex) => phoneIndex !== index);
      const nextPhoneTypes = current.phoneTypes.filter((_, phoneIndex) => phoneIndex !== index);

      return {
        ...current,
        phones: nextPhones.length > 0 ? nextPhones : [""],
        phoneTypes: nextPhoneTypes.length > 0 ? nextPhoneTypes : ["mobile"],
      };
    });
  }

  async function saveDraft() {
    if (!draft) return;

    const title = draft.title.trim();
    const category = draft.category.trim();
    const phones = normalizePhones(draft.phones);
    const phoneTypes = normalizeDraftPhoneTypes(draft.phoneTypes, phones);

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
      phoneTypes,
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

  async function saveSpecialistDraftAsTemplate() {
    if (!draft || workspaceMode !== "create") return;

    const slotIndex = findNextTemplateSlot(templates, SPECIALISTS_TEMPLATE_SLOT_LIMIT);

    if (!slotIndex) {
      setWorkspaceError(
        "Вільних слотів для шаблонів більше немає. Видаліть один із поточних шаблонів, щоб звільнити слот.",
      );
      return;
    }

    const title = draft.title.trim();
    const category = draft.category.trim();
    const phones = normalizePhones(draft.phones);
    const phoneTypes = normalizeDraftPhoneTypes(draft.phoneTypes, phones);

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
    setSavingTemplate(true);

    const saved = await dispatch(
      {
        type: "templates.upsert",
        houseId,
        payload: {
          sectionKind: "specialists",
          slotIndex,
          name: title,
          description: draft.description.trim(),
          payload: {
            categories: category ? [{ title: category }] : [],
            specialists: [
              {
                title,
                category,
                phones,
                phoneTypes,
                email: draft.email.trim(),
                description: draft.description.trim(),
                sortOrder: draft.sortOrder,
              },
            ],
          },
        },
      },
      {
        successMessage: "Шаблон спеціаліста збережено",
        onError: setWorkspaceError,
      },
    );

    setSavingTemplate(false);

    if (!saved && !lastError) {
      return;
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


  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label="Оновлюємо картки спеціалістів..."
        className="rounded-[var(--r-xl)]"
      />

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Спеціалісти
              </h2>
              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Керування окремими картками спеціалістів, шаблонами та статусами публікації.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTemplatesPanelOpen(true)}
                disabled={isPending || applyingTemplate}
                iconLeft={<TemplateIcon className="h-5 w-5" />}
              >
                Шаблони
              </Button>

              <Button type="button" onClick={openCreateMode} disabled={isPending}>
                Створити спеціаліста
              </Button>
            </div>
          </div>

          <AdminSegmentedTabs
            items={[
              { key: "published", label: "Активні", count: publishedItems.length },
              { key: "draft", label: "Чернетки", count: draftItems.length },
              { key: "archived", label: "Архів", count: archivedItems.length },
            ]}
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as WorkspaceTab);
              closeWorkspace();
            }}
            ariaLabel="Фільтр спеціалістів"
          />
        </div>
      </div>


      <AdminSidePanel
        title={workspaceMode === "create" ? "Новий спеціаліст" : "Редагування спеціаліста"}
        description={
          workspaceMode === "create"
            ? "Нова картка зберігається як чернетка. Публікація виконується окремою дією."
            : (
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusBadge tone={statusToneFor(draft?.status)}>
                  {statusLabelFor(draft?.status)}
                </AdminStatusBadge>
                <span>Зміни набудуть чинності після збереження.</span>
              </div>
            )
        }
        isOpen={workspaceMode !== "idle" && Boolean(draft)}
        onClose={closeWorkspace}
        maxWidthClassName="max-w-2xl"
        footer={
          draft ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={saveDraft} disabled={isPending}>
                Зберегти
              </Button>

              {workspaceMode === "edit" && draft.status === "draft" ? (
                <Button
                  type="button"
                  variant="success"
                  onClick={() => setConfirmAction("publish")}
                  disabled={isPending || savingTemplate}
                >
                  Опублікувати
                </Button>
              ) : null}

              {workspaceMode === "edit" && draft.status === "published" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmAction("archive")}
                  disabled={isPending}
                >
                  В архів
                </Button>
              ) : null}

              {workspaceMode === "edit" && draft.status === "archived" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmAction("restore")}
                  disabled={isPending}
                >
                  Відновити
                </Button>
              ) : null}

              <div className="min-w-0 flex-1" />

              {workspaceMode === "create" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void saveSpecialistDraftAsTemplate()}
                  disabled={isPending || savingTemplate}
                  loading={savingTemplate}
                >
                  Запамʼятати як шаблон
                </Button>
              ) : null}

              {workspaceMode === "edit" ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setConfirmAction("delete")}
                  disabled={isPending}
                >
                  Видалити
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {draft ? (
          <div className="space-y-6">
            {workspaceMode === "edit" && draft.status !== "draft" && draft.id ? (
              <div className="flex justify-end">
                <ContentWorkspaceActionButtons
                  houseId={houseId}
                  sourceId={draft.id}
                  commandType="specialists.duplicate"
                  duplicateTargets={duplicateTargets}
                  disabled={isPending}
                  onCopy={copySpecialistToDraft}
                  duplicatePanelTitle="Копії спеціаліста в інші будинки"
                />
              </div>
            ) : null}

            {workspaceError ? (
              <div
                role="alert"
                className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
              >
                {workspaceError}
              </div>
            ) : null}

            <FormField label="Ім’я та прізвище / Компанія" required>
              <Input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="Наприклад: Іван Петренко або Аварком сервіс"
              />
            </FormField>

            <FormField label="Категорія" required>
              <select
                value={draft.category}
                onChange={(event) => updateDraft("category", event.target.value)}
                className={adminSelectClass}
              >
                <option value="">Оберіть категорію</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Телефони"
              hint="Якщо телефони не вказані, на сайті будинку буде кнопка «Залишити заявку»."
            >
              <div className="grid gap-3">
                {draft.phones.map((phone, index) => (
                  <div
                    key={`phone-${index}`}
                    className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]"
                  >
                    <select
                      value={normalizePhoneType(draft.phoneTypes[index])}
                      onChange={(event) =>
                        handleDraftPhoneTypeChange(
                          index,
                          event.target.value as SpecialistPhoneType,
                        )
                      }
                      className={adminSelectClass}
                      aria-label={`Тип телефону ${index + 1}`}
                    >
                      {SPECIALIST_PHONE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <Input
                      value={phone}
                      onChange={(event) => handleDraftPhoneChange(index, event.target.value)}
                      placeholder="+380 67 123 45 67 або 0800 00 00 00"
                      aria-label={`Телефон ${index + 1}`}
                    />

                    {draft.phones.length > 1 ? (
                      <IconButton
                        type="button"
                        variant="danger"
                        onClick={() => removeDraftPhone(index)}
                        aria-label={`Видалити телефон ${index + 1}`}
                      >
                        ×
                      </IconButton>
                    ) : null}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={addDraftPhone}
              >
                Додати ще телефон
              </Button>
            </FormField>

            <FormField label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                placeholder="specialist@example.com"
              />
            </FormField>

            <FormField label="Опис / графік / примітки">
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                className={adminTextareaClass}
                placeholder="Опишіть, коли звертатися до спеціаліста, графік прийому або додаткові умови."
              />
            </FormField>

            <FormField label="Порядок сортування">
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(event) =>
                  updateDraft("sortOrder", Number.parseInt(event.target.value, 10) || 0)
                }
              />
            </FormField>
          </div>
        ) : null}
      </AdminSidePanel>

      <AdminSidePanel
        title="Шаблони спеціалістів"
        description="Оберіть збережений шаблон. Після підтвердження він створить чернетку в поточному будинку."
        isOpen={templatesPanelOpen}
        onClose={() => setTemplatesPanelOpen(false)}
      >
        <ContentTemplateSlotsPanel
          houseId={houseId}
          sectionKind="specialists"
          slotLimit={SPECIALISTS_TEMPLATE_SLOT_LIMIT}
          templates={templates}
          title="Збережені шаблони спеціалістів"
          description="Шаблони доступні в усіх будинках. Новий шаблон створюється з чернетки спеціаліста."
          disabled={isPending || applyingTemplate}
          onApplyTemplateKeys={applySpecialistsTemplateKeys}
        />
      </AdminSidePanel>

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleSpecialists.length > 0 ? (
            visibleSpecialists.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEditMode(item)}
                className="block w-full rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-left transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface)]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <AdminStatusBadge tone={statusToneFor(item.status)}>
                    {statusLabelFor(item.status)}
                  </AdminStatusBadge>

                  {item.content.category ? (
                    <span className="inline-flex rounded-[var(--r-pill)] border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
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
                      ? item.content.phones
                          .map((phone, index) => `${getPhoneTypeLabel(normalizePhoneType(item.content.phoneTypes[index]))}: ${phone}`)
                          .join(", ")
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
            <EmptyState
              title={activeTab === "published" ? "Опублікованих спеціалістів поки немає" : activeTab === "draft" ? "Чернеток спеціалістів поки немає" : "Архів спеціалістів поки порожній"}
              description={activeTab === "published" ? "Створіть першу картку та опублікуйте її." : activeTab === "draft" ? "Чернетки з’являтимуться тут після створення або відновлення." : "Зняті з публікації картки відображатимуться тут."}
              action={!String(activeTab).startsWith("archiv") ? (
                <Button type="button" onClick={openCreateMode}>
                  Створити спеціаліста
                </Button>
              ) : undefined}
            />
          )}
        </div>
      </div>

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
