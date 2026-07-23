"use client";

import { useMemo, useState } from "react";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import type {
  AdminHouseBoard,
  AdminHouseBoardMember,
} from "@/src/modules/houses/services/getAdminHouseBoard";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { Button } from "@/src/shared/ui/admin/Button";
import { FormField } from "@/src/shared/ui/admin/FormField";
import { Input } from "@/src/shared/ui/admin/Input";
import {
  adminSelectClass,
  adminTextareaClass,
} from "@/src/shared/ui/admin/adminStyles";
import {
  mapBoardMemberCommandResponse,
  type BoardMemberClientItem,
} from "@/src/modules/houses/components/boardMemberClientMapper";

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

type BoardRoleItem = BoardMemberClientItem;

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
  board: AdminHouseBoard;
};

const TAB_CONFIG: Array<{
  key: BoardTabKey;
  label: string;
  status: BoardRoleStatus;
  emptyText: string;
}> = [
  {
    key: "chairman",
    label: "Голова правління",
    status: "chairman",
    emptyText: "Картку голови правління ще не створено.",
  },
  {
    key: "vice_chairman",
    label: "Заступник голови правління",
    status: "vice_chairman",
    emptyText: "Картку заступника голови правління ще не створено.",
  },
  {
    key: "members",
    label: "Члени правління",
    status: "member",
    emptyText: "У цій вкладці поки немає членів правління.",
  },
  {
    key: "revision_commission",
    label: "Ревізійна комісія",
    status: "revision_commission",
    emptyText: "У цій вкладці поки немає карток ревізійної комісії.",
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
      return "Голова правління";
    case "vice_chairman":
      return "Заступник голови правління";
    case "member":
      return "Члени правління";
    case "revision_commission":
      return "Ревізійна комісія";
    default:
      return "Посада";
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

function normalizeBoardData(board: AdminHouseBoard) {
  return {
    intro: board.intro.intro,
    introLockVersion: board.intro.lockVersion,
    roles: board.members
      .map((member) => ({
        id: member.id,
        status: member.roleStatus,
        name: member.name.trim(),
        role: member.role.trim() || getRoleLabel(member.roleStatus),
        phone: member.phone.trim(),
        email: member.email.trim(),
        officeHours: member.officeHours.trim(),
        description: member.description.trim(),
        sortOrder: member.sortOrder,
        lockVersion: member.lockVersion,
      }) satisfies BoardRoleItem)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  };
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
  return parts.length > 0 ? parts.join(" • ") : "Контакти не вказані";
}

function mapSavedMember(member: unknown): BoardRoleItem {
  const saved = mapBoardMemberCommandResponse(
    member as Parameters<typeof mapBoardMemberCommandResponse>[0],
  );

  return {
    ...saved,
    role: saved.role || getRoleLabel(saved.status),
  };
}

export function EditBoardSectionForm({
  houseId,
  board,
  readOnlyMode,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const initialBoardData = useMemo(
    () => normalizeBoardData(board),
    [board],
  );

  const [intro, setIntro] = useState(initialBoardData.intro);
  const [savedIntro, setSavedIntro] = useState(initialBoardData.intro);
  const [introLockVersion, setIntroLockVersion] = useState(
    initialBoardData.introLockVersion,
  );
  const [isSectionPanelOpen, setIsSectionPanelOpen] = useState(false);

  const [roles, setRoles] = useState<BoardRoleItem[]>(initialBoardData.roles);
  const [activeTab, setActiveTab] = useState<BoardTabKey>("chairman");

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [draft, setDraft] = useState<BoardDraft | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

  function closeWorkspace() {
    setWorkspaceMode("idle");
    setDraft(null);
    setWorkspaceError(null);
    setIsDeleteConfirmOpen(false);
  }

  function openCreateMode() {
    if (readOnlyMode) return;

    setIsSectionPanelOpen(true);
    setWorkspaceError(null);
    setIsDeleteConfirmOpen(false);
    setWorkspaceMode("create");
    setDraft(createEmptyDraft(getDefaultStatusByTab(activeTab)));
  }

  function openEditMode(roleId: string) {
    if (readOnlyMode) return;

    const role = roles.find((item) => item.id === roleId);
    if (!role) return;

    setIsSectionPanelOpen(true);
    setWorkspaceError(null);
    setIsDeleteConfirmOpen(false);
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

  async function handleSaveDraft() {
    if (!draft || readOnlyMode) {
      return;
    }

    const trimmedName = draft.name.trim();
    const trimmedPhone = draft.phone.trim();
    const trimmedEmail = draft.email.trim();
    const trimmedOfficeHours = draft.officeHours.trim();
    const trimmedDescription = draft.description.trim();

    if (!trimmedName) {
      setWorkspaceError("Вкажіть ім’я.");
      return;
    }

    if (draft.status === "chairman" && chairman && chairman.id !== draft.id) {
      setWorkspaceError(
        "Голову правління вже призначено. Щоб додати нового, спочатку видаліть поточну картку голови правління.",
      );
      return;
    }

    if (
      draft.status === "vice_chairman" &&
      viceChairman &&
      viceChairman.id !== draft.id
    ) {
      setWorkspaceError(
        "Заступника голови правління вже призначено. Щоб додати нового, спочатку видаліть поточну картку заступника голови правління.",
      );
      return;
    }

    setWorkspaceError(null);

    const normalizedRole = {
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

    const existing = roles.find((item) => item.id === draft.id);

    if (existing) {
      await dispatch<AdminHouseBoardMember>(
        {
          type: "board_members.update",
          houseId,
          payload: {
            id: existing.id,
            lockVersion: existing.lockVersion,
            roleStatus: normalizedRole.status,
            name: normalizedRole.name,
            role: normalizedRole.role,
            phone: normalizedRole.phone,
            email: normalizedRole.email,
            officeHours: normalizedRole.officeHours,
            description: normalizedRole.description,
            sortOrder: existing.sortOrder,
          },
        },
        {
          onSuccess(data) {
            const saved = mapSavedMember(data as AdminHouseBoardMember);
            setRoles((prev) =>
              prev.map((item) => (item.id === saved.id ? saved : item)),
            );
            closeWorkspace();
          },
        },
      );
      return;
    }

    await dispatch<AdminHouseBoardMember>(
      {
        type: "board_members.create",
        houseId,
        payload: {
          roleStatus: normalizedRole.status,
          name: normalizedRole.name,
          role: normalizedRole.role,
          phone: normalizedRole.phone,
          email: normalizedRole.email,
          officeHours: normalizedRole.officeHours,
          description: normalizedRole.description,
          sortOrder: roles.length,
        },
      },
      {
        onSuccess(data) {
          const saved = mapSavedMember(data as AdminHouseBoardMember);
          setRoles((prev) => [...prev, saved]);
          closeWorkspace();
        },
      },
    );
  }

  async function handleDeleteDraftRole() {
    if (!draft || workspaceMode !== "edit" || readOnlyMode) {
      return;
    }

    const existing = roles.find((item) => item.id === draft.id);
    if (!existing) {
      setWorkspaceError("Не вдалося знайти роль для видалення.");
      setIsDeleteConfirmOpen(false);
      return;
    }

    await dispatch<AdminHouseBoardMember>(
      {
        type: "board_members.delete",
        houseId,
        payload: {
          id: existing.id,
          lockVersion: existing.lockVersion,
        },
      },
      {
        onSuccess() {
          setRoles((prev) => prev.filter((item) => item.id !== existing.id));
          closeWorkspace();
        },
      },
    );
  }

  async function handleSaveIntro() {
    if (!introDirty || readOnlyMode) {
      return;
    }

    await dispatch<{ intro: string; lockVersion: number }>(
      {
        type: "board_intro.save",
        houseId,
        payload: {
          lockVersion: introLockVersion,
          intro,
        },
      },
      {
        onSuccess(data) {
          const saved = data as { intro: string; lockVersion: number };
          setIntro(saved.intro);
          setSavedIntro(saved.intro);
          setIntroLockVersion(saved.lockVersion);
        },
      },
    );
  }

  const activeTabConfig = TAB_CONFIG.find((item) => item.key === activeTab);

  function closeSectionPanel() {
    if (isPending) {
      return;
    }

    setIntro(savedIntro);
    closeWorkspace();
    setIsSectionPanelOpen(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--cms-text)]">
              Правління
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cms-text-muted)]">
              Склад правління, контакти відповідальних осіб і звернення, які мешканці бачать на сайті будинку.
            </p>
          </div>

          {!readOnlyMode ? (
            <Button
              type="button"
              size="lg"
              onClick={() => setIsSectionPanelOpen(true)}
            >
              Редагувати розділ
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-sm)]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
            Вступ
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
            Звернення від правління
          </h3>
        </div>

        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 text-sm leading-7 text-[var(--cms-text-muted)]">
          {intro || "Звернення поки не заповнено"}
        </div>
      </section>

      <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-sm)]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
            Команда
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
            Члени правління
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
            Актуальні представники та їхні контактні дані.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {roles.length > 0 ? (
            [...roles]
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((role) => (
                <article
                  key={role.id}
                  className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex rounded-[var(--r-pill)] border border-[var(--cms-border-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
                        {role.role || getRoleLabel(role.status)}
                      </div>
                      <div className="mt-3 text-base font-semibold text-[var(--cms-text)]">
                        {role.name || "Без імені"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                        {buildRolePreview(role)}
                      </div>
                      {role.description ? (
                        <div className="mt-2 text-sm leading-6 text-[var(--cms-text-soft)]">
                          {role.description}
                        </div>
                      ) : null}
                    </div>

                    {!readOnlyMode ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditMode(role.id)}
                      >
                        Редагувати
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))
          ) : (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] px-5 py-6 text-sm text-[var(--cms-text-muted)]">
              Представників правління поки не додано.
            </div>
          )}
        </div>
      </section>

      <AdminSidePanel
        title="Редагування правління"
        description="Вступ і члени правління редагуються в одному робочому просторі, але зберігаються окремими безпечними командами."
        isOpen={isSectionPanelOpen && !readOnlyMode}
        onClose={closeSectionPanel}
        maxWidthClassName="max-w-4xl"
      >
        <div className="space-y-8">
          <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                Вступ
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
                Звернення від правління
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                Текст відображається у верхній частині публічної сторінки правління.
              </p>
            </div>

            <FormField
              label="Текст звернення"
              className="mt-5"
            >
              <textarea
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                rows={7}
                placeholder="Введіть звернення від правління..."
                className={adminTextareaClass}
              />
            </FormField>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleSaveIntro}
                disabled={!introDirty || isPending}
                loading={isPending}
              >
                Зберегти вступ
              </Button>

              {introDirty ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIntro(savedIntro)}
                  disabled={isPending}
                >
                  Скасувати зміни
                </Button>
              ) : null}
            </div>
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                  Члени правління
                </div>
                <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
                  Картки представників
                </h3>
              </div>

              <Button
                type="button"
                onClick={openCreateMode}
                disabled={isPending}
              >
                Додати представника
              </Button>
            </div>

            <div className="mt-5">
              <AdminSegmentedTabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as BoardTabKey)}
                items={TAB_CONFIG.map((tab) => ({
                  key: tab.key,
                  label: tab.label,
                  count:
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
                          : revisionCommission.length,
                }))}
              />
            </div>

            <div className="mt-5 space-y-3">
              {visibleRoles.length > 0 ? (
                visibleRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => openEditMode(role.id)}
                    className="block w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4 text-left transition hover:border-[var(--cms-border-strong)]"
                  >
                    <div className="text-sm font-semibold text-[var(--cms-text)]">
                      {role.name || "Без імені"}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-[var(--cms-text-soft)]">
                      {role.role || getRoleLabel(role.status)}
                    </div>
                    <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
                      {buildRolePreview(role)}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] px-4 py-5 text-sm text-[var(--cms-text-muted)]">
                  {activeTabConfig?.emptyText ?? "У цій категорії поки немає карток."}
                </div>
              )}
            </div>
          </section>

          {workspaceMode !== "idle" && draft ? (
            <section className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
                  {workspaceMode === "create" ? "Новий запис" : "Редагування"}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-[var(--cms-text)]">
                  {workspaceMode === "create"
                    ? "Новий представник"
                    : "Редагування представника"}
                </h3>
              </div>

              {workspaceError || lastError ? (
                <div
                  role="alert"
                  className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
                >
                  {workspaceError || lastError}
                </div>
              ) : null}

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <FormField label="Посада" required>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      handleDraftChange(
                        "status",
                        event.target.value as BoardRoleStatus,
                      )
                    }
                    className={adminSelectClass}
                  >
                    <option value="chairman">Голова правління</option>
                    <option value="vice_chairman">
                      Заступник голови правління
                    </option>
                    <option value="member">Член правління</option>
                    <option value="revision_commission">
                      Ревізійна комісія
                    </option>
                  </select>
                </FormField>

                <FormField label="Ім’я" required>
                  <Input
                    value={draft.name}
                    onChange={(event) =>
                      handleDraftChange("name", event.target.value)
                    }
                    placeholder="Введіть ім’я"
                  />
                </FormField>

                <FormField label="Телефон">
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(event) =>
                      handleDraftChange("phone", event.target.value)
                    }
                    placeholder="+380 67 123 45 67"
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      handleDraftChange("email", event.target.value)
                    }
                    placeholder="name@example.com"
                  />
                </FormField>

                <FormField
                  label="Години прийому / зв’язку"
                  className="md:col-span-2"
                >
                  <Input
                    value={draft.officeHours}
                    onChange={(event) =>
                      handleDraftChange("officeHours", event.target.value)
                    }
                    placeholder="Пн–Пт, 10:00–18:00"
                  />
                </FormField>

                <FormField
                  label="Опис"
                  className="md:col-span-2"
                >
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      handleDraftChange("description", event.target.value)
                    }
                    rows={5}
                    className={adminTextareaClass}
                    placeholder="Короткий опис функцій і зони відповідальності"
                  />
                </FormField>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--cms-border)] pt-5">
                <Button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isPending}
                  loading={isPending}
                >
                  Зберегти представника
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeWorkspace}
                  disabled={isPending}
                >
                  Скасувати
                </Button>

                <div className="min-w-0 flex-1" />

                {workspaceMode === "edit" ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={isPending}
                  >
                    Видалити
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </AdminSidePanel>

      <PlatformConfirmModal
        open={isDeleteConfirmOpen}
        tone="destructive"
        title="Видалити роль?"
        description="Цю дію не можна буде скасувати."
        confirmLabel="Видалити"
        pendingLabel="Видаляємо..."
        isPending={isPending}
        onConfirm={handleDeleteDraftRole}
        onCancel={() => {
          if (!isPending) {
            setIsDeleteConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}
