"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminDangerButtonClass,
  adminInputClass,
  adminIconButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

const initialState = {
  error: null,
};

type SectionStatus = "draft" | "in_review" | "published" | "archived";
type BoardRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";
type BoardTabKey =
  | "chairman"
  | "vice_chairman"
  | "members"
  | "revision_commission";
type WorkspaceMode = "idle" | "create" | "edit";

type BoardRoleItem = {
  id: string;
  status: BoardRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
  sortOrder: number;
};

type BoardDraft = {
  id: string;
  status: BoardRoleStatus;
  name: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
};

type Props = {
  readOnlyMode?: boolean;
  houseId: string;
  houseSlug: string;
  section: {
    id: string;
    title: string | null;
    status: SectionStatus;
    content: Record<string, unknown>;
  };
};

const TAB_CONFIG: Array<{
  key: BoardTabKey;
  label: string;
  status: BoardRoleStatus;
  emptyText: string;
}> = [
  {
    key: "chairman",
    label: "Председатель",
    status: "chairman",
    emptyText: "Карточка председателя пока не создана.",
  },
  {
    key: "vice_chairman",
    label: "Заместитель председателя",
    status: "vice_chairman",
    emptyText: "Карточка заместителя председателя пока не создана.",
  },
  {
    key: "members",
    label: "Члены правления",
    status: "member",
    emptyText: "В этом табе пока нет членов правления.",
  },
  {
    key: "revision_commission",
    label: "Ревизионная комиссия",
    status: "revision_commission",
    emptyText: "В этом табе пока нет карточек ревизионной комиссии.",
  },
];

function createRoleId() {
  return `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyDraft(status: BoardRoleStatus = "member"): BoardDraft {
  return {
    id: createRoleId(),
    status,
    name: "",
    phone: "",
    email: "",
    officeHours: "",
    description: "",
  };
}

function getRoleLabel(status: BoardRoleStatus) {
  switch (status) {
    case "chairman":
      return "Председатель";
    case "vice_chairman":
      return "Заместитель председателя";
    case "member":
      return "Члены правления";
    case "revision_commission":
      return "Ревизионная комиссия";
    default:
      return "Роль";
  }
}

function getDefaultStatusByTab(tab: BoardTabKey): BoardRoleStatus {
  switch (tab) {
    case "chairman":
      return "chairman";
    case "vice_chairman":
      return "vice_chairman";
    case "members":
      return "member";
    case "revision_commission":
      return "revision_commission";
    default:
      return "member";
  }
}

function formatUkrainianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = `38${normalized}`;
  }
  if (normalized.startsWith("80")) {
    normalized = `3${normalized}`;
  }
  if (!normalized.startsWith("380")) {
    normalized = `380${normalized}`;
  }

  normalized = normalized.slice(0, 12);

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

function normalizeLegacyContent(content: Record<string, unknown>) {
  const intro =
    typeof content.intro === "string"
      ? content.intro
      : typeof content.message === "string"
        ? content.message
        : "";

  const rolesFromNewStructure = Array.isArray(content.roles)
    ? content.roles
        .map((item, index) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const raw = item as Record<string, unknown>;
          const status: BoardRoleStatus =
            raw.status === "chairman" ||
            raw.status === "vice_chairman" ||
            raw.status === "member" ||
            raw.status === "revision_commission"
              ? raw.status
              : "member";

          return {
            id:
              typeof raw.id === "string" && raw.id.trim().length > 0
                ? raw.id
                : `role-${index + 1}`,
            status,
            name: String(raw.name ?? "").trim(),
            role: String(raw.role ?? getRoleLabel(status)).trim(),
            phone: String(raw.phone ?? "").trim(),
            email: String(raw.email ?? "").trim(),
            officeHours: String(raw.officeHours ?? "").trim(),
            description: String(raw.description ?? "").trim(),
            sortOrder:
              typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
                ? raw.sortOrder
                : index,
          } satisfies BoardRoleItem;
        })
        .filter((item): item is BoardRoleItem => Boolean(item))
    : [];

  if (rolesFromNewStructure.length > 0) {
    return {
      intro,
      roles: [...rolesFromNewStructure].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
    };
  }

  const legacyChairman =
    content.chairman && typeof content.chairman === "object"
      ? (content.chairman as Record<string, unknown>)
      : null;

  const legacyMembers = Array.isArray(content.members)
    ? content.members
        .map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : null,
        )
        .filter((item): item is Record<string, unknown> => Boolean(item))
    : [];

  const roles: BoardRoleItem[] = [];

  if (legacyChairman) {
    roles.push({
      id: "legacy-chairman",
      status: "chairman",
      name: String(legacyChairman.name ?? "").trim(),
      role: "Председатель",
      phone: String(legacyChairman.phone ?? "").trim(),
      email: String(legacyChairman.email ?? "").trim(),
      officeHours: String(legacyChairman.officeHours ?? "").trim(),
      description: String(legacyChairman.description ?? "").trim(),
      sortOrder: 0,
    });
  }

  legacyMembers.forEach((member, index) => {
    roles.push({
      id: `legacy-member-${index + 1}`,
      status: "member",
      name: String(member.name ?? "").trim(),
      role: "Члены правления",
      phone: String(member.phone ?? "").trim(),
      email: String(member.email ?? "").trim(),
      officeHours: String(member.officeHours ?? "").trim(),
      description: String(member.description ?? "").trim(),
      sortOrder: roles.length + index,
    });
  });

  return { intro, roles };
}

function toDraft(role: BoardRoleItem): BoardDraft {
  return {
    id: role.id,
    status: role.status,
    name: role.name,
    phone: role.phone,
    email: role.email,
    officeHours: role.officeHours,
    description: role.description,
  };
}

function buildRolePreview(role: BoardRoleItem) {
  const parts = [role.phone, role.email, role.officeHours].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Контакты не указаны";
}

export function EditBoardSectionForm({
  houseId,
  houseSlug,
  section,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const initialBoardData = useMemo(
    () => normalizeLegacyContent(section.content),
    [section.content],
  );

  const [intro, setIntro] = useState(initialBoardData.intro);
  const [savedIntro, setSavedIntro] = useState(initialBoardData.intro);
  const [isEditingIntro, setIsEditingIntro] = useState(false);

  const [roles, setRoles] = useState<BoardRoleItem[]>(initialBoardData.roles);
  const [activeTab, setActiveTab] = useState<BoardTabKey>("chairman");

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [draft, setDraft] = useState<BoardDraft | null>(null);

  const [submitNonce, setSubmitNonce] = useState(0);
  const [pendingIntroSave, setPendingIntroSave] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const chairman = roles.find((item) => item.status === "chairman") ?? null;
  const viceChairman =
    roles.find((item) => item.status === "vice_chairman") ?? null;
  const members = roles
    .filter((item) => item.status === "member")
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const revisionCommission = roles
    .filter((item) => item.status === "revision_commission")
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const visibleRoles = useMemo(() => {
    switch (activeTab) {
      case "chairman":
        return chairman ? [chairman] : [];
      case "vice_chairman":
        return viceChairman ? [viceChairman] : [];
      case "members":
        return members;
      case "revision_commission":
        return revisionCommission;
      default:
        return [];
    }
  }, [activeTab, chairman, viceChairman, members, revisionCommission]);

  const introDirty = intro !== savedIntro;

  useEffect(() => {
    if (submitNonce > 0 && formRef.current) {
      formRef.current.requestSubmit();
    }
  }, [submitNonce]);

  function triggerSubmit() {
    if (pendingIntroSave) {
      setSavedIntro(intro);
      setIsEditingIntro(false);
      setPendingIntroSave(false);
    }

    setSubmitNonce((prev) => prev + 1);
  }

  function closeWorkspace() {
    setWorkspaceMode("idle");
    setDraft(null);
  }

  function openCreateMode() {
    setWorkspaceMode("create");
    setDraft(createEmptyDraft(getDefaultStatusByTab(activeTab)));
  }

  function openEditMode(roleId: string) {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;

    setWorkspaceMode("edit");
    setDraft(toDraft(role));
  }

  function handleDraftChange(
    field: keyof Omit<BoardDraft, "id">,
    value: string,
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]:
          field === "phone" ? formatUkrainianPhone(value) : value,
      };
    });
  }

  function persistRoles(nextRoles: BoardRoleItem[]) {
    setRoles(
      nextRoles.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    );
    triggerSubmit();
  }

  function handleSaveDraft() {
    if (!draft) {
      return;
    }

    const trimmedName = draft.name.trim();
    const trimmedPhone = draft.phone.trim();
    const trimmedEmail = draft.email.trim();
    const trimmedOfficeHours = draft.officeHours.trim();
    const trimmedDescription = draft.description.trim();

    if (!trimmedName) {
      window.alert("Укажите имя.");
      return;
    }

    if (draft.status === "chairman" && chairman && chairman.id !== draft.id) {
      window.alert(
        "Председатель уже назначен. Чтобы добавить нового, сначала удалите текущую карточку председателя.",
      );
      return;
    }

    if (
      draft.status === "vice_chairman" &&
      viceChairman &&
      viceChairman.id !== draft.id
    ) {
      window.alert(
        "Заместитель председателя уже назначен. Чтобы добавить нового, сначала удалите текущую карточку заместителя председателя.",
      );
      return;
    }

    const normalizedRole: BoardRoleItem = {
      id: draft.id,
      status: draft.status,
      name: trimmedName,
      role: getRoleLabel(draft.status),
      phone: trimmedPhone,
      email: trimmedEmail,
      officeHours: trimmedOfficeHours,
      description: trimmedDescription,
      sortOrder: 0,
    };

    const existingIndex = roles.findIndex((item) => item.id === draft.id);

    let nextRoles: BoardRoleItem[];
    if (existingIndex >= 0) {
      nextRoles = roles.map((item) =>
        item.id === normalizedRole.id
          ? { ...normalizedRole, sortOrder: item.sortOrder }
          : item,
      );
    } else {
      nextRoles = [...roles, { ...normalizedRole, sortOrder: roles.length }];
    }

    closeWorkspace();
    persistRoles(nextRoles);
  }

  function handleDeleteDraftRole() {
    if (!draft || workspaceMode !== "edit") {
      return;
    }

    const confirmed = window.confirm("Удалить эту роль?");
    if (!confirmed) {
      return;
    }

    const nextRoles = roles.filter((item) => item.id !== draft.id);
    closeWorkspace();
    persistRoles(nextRoles);
  }

  function handleSaveIntro() {
    if (!introDirty || !formRef.current) {
      return;
    }

    setPendingIntroSave(true);
    setSavedIntro(intro);
    setIsEditingIntro(false);
    setPendingIntroSave(false);
    formRef.current.requestSubmit();
  }

  const serializedBoardPayload = JSON.stringify({
    intro: intro.trim(),
    roles: roles.map((item, index) => ({
      ...item,
      role: item.role || getRoleLabel(item.status),
      sortOrder: index,
    })),
  });

  const activeTabConfig = TAB_CONFIG.find((item) => item.key === activeTab);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="space-y-6">
        <input type="hidden" name="sectionId" value={section.id} />
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="kind" value="contacts" />
        <input type="hidden" name="title" value={section.title ?? "Правление"} />
        <input type="hidden" name="status" value={section.status} />
        <input type="hidden" name="boardPayload" value={serializedBoardPayload} />

        <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--cms-text)]">Правление</h2>
                <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                  Состав правления, контакты ответственных лиц и карточки, которые жители видят на сайте дома.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateMode}
                className={[adminPrimaryButtonClass, "h-12 shrink-0 whitespace-nowrap"].join(" ")}
              >
                Создать роль
              </button>
            </div>

            <div className="min-w-0 overflow-x-auto">
              <div className="flex min-w-max flex-nowrap gap-3">
                {TAB_CONFIG.map((tab) => {
                  const count =
                    tab.status === "chairman"
                      ? chairman
                        ? 1
                        : 0
                      : tab.status === "vice_chairman"
                        ? viceChairman
                          ? 1
                          : 0
                        : tab.status === "member"
                          ? members.length
                          : revisionCommission.length;

                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-medium whitespace-nowrap transition ${
                        isActive
                          ? "bg-[var(--cms-primary)] text-white"
                          : "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)]/40 text-[var(--cms-text)]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isActive
                            ? "bg-white text-[var(--cms-text)]"
                            : "bg-[var(--cms-surface-muted)] text-[var(--cms-text)]"
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
        </div>

        <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--cms-text)]">
                Обращение от правления
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                Этот текст будет отображаться в самом верху публичной страницы
                правления.
              </p>
            </div>

            {isEditingIntro ? (
              <button
                type="button"
                onClick={() => {
                  setIntro(savedIntro);
                  setIsEditingIntro(false);
                }}
                className={adminIconButtonClass}
                aria-label="Закрыть форму"
              >
                ×
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingIntro(true)}
                className={adminSecondaryButtonClass}
              >
                Редактировать
              </button>
            )}
          </div>

          {isEditingIntro ? (
            <div className="mt-4 space-y-4">
              <textarea
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                rows={6}
                placeholder="Введите обращение от правления..."
                className={adminInputClass}
              />

              <button
                type="button"
                onClick={handleSaveIntro}
                disabled={!introDirty || isPending}
                className={[adminPrimaryButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
              >
                {isPending ? "Сохраняем..." : "Сохранить обращение"}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-muted)]/40 p-4 text-sm leading-7 text-[var(--cms-text-muted)]">
              {intro || "Обращение пока не заполнено"}
            </div>
          )}
        </div>

        {workspaceMode !== "idle" && draft ? (
          <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-[var(--cms-text)]">
                  {workspaceMode === "create"
                    ? "Новая роль"
                    : "Редактирование роли"}
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                  После сохранения карточка автоматически закроется и появится в
                  соответствующем табе.
                </div>
              </div>

              <button
                type="button"
                onClick={closeWorkspace}
                aria-label="Закрыть форму"
                className={adminIconButtonClass}
              >
                ×
              </button>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Должность
                  </label>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      handleDraftChange(
                        "status",
                        event.target.value as BoardRoleStatus,
                      )
                    }
                    className={adminInputClass}
                  >
                    <option value="chairman">Председатель</option>
                    <option value="vice_chairman">
                      Заместитель председателя
                    </option>
                    <option value="member">Члены правления</option>
                    <option value="revision_commission">
                      Ревизионная комиссия
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Имя
                  </label>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      handleDraftChange("name", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="Введите имя"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(event) =>
                      handleDraftChange("phone", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="+380 67 123 45 67"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Email
                  </label>
                  <input
                    value={draft.email}
                    onChange={(event) =>
                      handleDraftChange("email", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Часы приема / связи
                  </label>
                  <input
                    value={draft.officeHours}
                    onChange={(event) =>
                      handleDraftChange("officeHours", event.target.value)
                    }
                    className={adminInputClass}
                    placeholder="Пн–Пт, 10:00–18:00"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Описание
                  </label>
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      handleDraftChange("description", event.target.value)
                    }
                    rows={5}
                    className={adminInputClass}
                    placeholder="Короткое описание функций и зоны ответственности"
                  />
                </div>
              </div>
              <div className="overflow-x-auto border-t border-[var(--cms-border)] pt-5">
                <div className="flex min-w-max flex-nowrap items-end gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="inline-flex items-center justify-center rounded-3xl ${adminPrimaryButtonClass} px-8 py-4 text-base"
                  >
                    Сохранить
                  </button>

                  {workspaceMode === "edit" ? (
                    <button
                      type="button"
                      onClick={handleDeleteDraftRole}
                      className={[adminDangerButtonClass, "rounded-3xl px-8 py-4 text-base"].join(" ")}
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--cms-text)]">
              {activeTabConfig?.label ?? "Роли правления"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
              Здесь отображаются карточки, которые будут опубликованы на сайте
              дома в соответствующем разделе.
            </p>
          </div>

          <div className="space-y-4">
            {visibleRoles.length > 0 ? (
              visibleRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => openEditMode(role.id)}
                  className="w-full rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-muted)]/40 p-4 text-left transition hover:border-[var(--cms-border)] hover:bg-[var(--cms-surface-muted)]/70"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-[var(--cms-border)] bg-slate-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
                        {role.role || getRoleLabel(role.status)}
                      </span>
                    </div>

                    <div className="truncate text-base font-semibold text-[var(--cms-text)]">
                      {role.name || "Без имени"}
                    </div>

                    <div className="mt-3 text-sm leading-6 text-[var(--cms-text-muted)]">
                      {buildRolePreview(role)}
                    </div>

                    {role.description ? (
                      <div className="mt-3 text-sm leading-6 text-slate-500">
                        {role.description.length > 140
                          ? `${role.description.slice(0, 140).trim()}…`
                          : role.description}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
                {activeTabConfig?.emptyText ?? "В этом табе пока нет карточек."}
              </div>
            )}
          </div>
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        ) : null}
      </form>
    </div>
  );
}
