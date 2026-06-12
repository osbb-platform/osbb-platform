"use client";

import { CrossHouseDuplicatePanel, type CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";

import { useMemo, useState } from "react";
import { CreateAnnouncementInlineForm } from "@/src/modules/houses/components/CreateAnnouncementInlineForm";
import { EditAnnouncementSectionForm } from "@/src/modules/houses/components/EditAnnouncementSectionForm";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import {
  adminBodyClass,
  adminDangerButtonClass,
  adminEmptyStateClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

type AnnouncementItem = {
  id: string;
  title: string | null;
  status: "draft" | "published" | "archived";
  content: Record<string, unknown>;
};

type HouseAnnouncementsWorkspaceProps = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  sections: AnnouncementItem[];
  duplicateTargets?: CrossHouseDuplicateTarget[];
};

type TabKey = "active" | "moderation" | "archive";
type WorkspaceMode = "idle" | "create" | "edit";

function getSortTimestamp(content: Record<string, unknown>) {
  const candidates = [
    content.publishedAt,
    content.updatedAt,
    content.createdAt,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value) {
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) {
        return time;
      }
    }
  }

  return 0;
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "Не опубліковано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Не опубліковано";
  }

  return date.toLocaleString("ru-RU");
}

function getStatusLabel(status: AnnouncementItem["status"]) {
  if (status === "published") return "Опубліковано";
  if (status === "archived") return "Архів";
  return "Чернетка";
}

function getStatusTone(
  status: AnnouncementItem["status"],
): "success" | "warning" | "neutral" | "info" {
  if (status === "published") return "success";
  if (status === "archived") return "neutral";
  return "info";
}

function getLevelLabel(level: string) {
  if (level === "danger") return "Важливе";
  if (level === "warning") return "Звернути увагу";
  return "Звичайне";
}

function getLevelDotClasses(level: string) {
  if (level === "danger") return "bg-[var(--cms-danger-text)]";
  if (level === "warning") return "bg-[var(--cms-warning-text)]";
  return "bg-[#85e874]";
}

function getPreviewText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Оголошення без тексту.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 140).trim()}…`;
}

export function HouseAnnouncementsWorkspace({
  houseId,
  houseSlug,
  housePageId,
  sections,
  duplicateTargets = [],
}: HouseAnnouncementsWorkspaceProps) {
  const { dispatch, isPending: isDeletingArchive, lastError } = useAdminContentCommand();
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [mode, setMode] = useState<WorkspaceMode>("idle");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [copyingSectionId, setCopyingSectionId] = useState<string | null>(null);
  const [isDeleteArchiveConfirmOpen, setIsDeleteArchiveConfirmOpen] = useState(false);

  const [createBaseline, setCreateBaseline] = useState<number | null>(null);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      const aTime = getSortTimestamp(a.content);
      const bTime = getSortTimestamp(b.content);

      if (bTime !== aTime) {
        return bTime - aTime;
      }

      return a.id.localeCompare(b.id);
    });
  }, [sections]);

  const activeAnnouncements = sortedSections.filter(
    (section) => section.status === "published",
  );

  const moderationAnnouncements = sortedSections.filter(
    (section) =>
      section.status === "draft",
  );

  const archivedAnnouncements = sortedSections.filter(
    (section) => section.status === "archived",
  );

  const tabMap = {
    active: activeAnnouncements,
    moderation: moderationAnnouncements,
    archive: archivedAnnouncements,
  };

  const visibleSections = tabMap[activeTab];

  function closeWorkspace() {
    setWorkspaceError(null);
    setIsDeleteArchiveConfirmOpen(false);
    setCreateBaseline(null);
    setMode("idle");
    setSelectedSectionId(null);
  }

  const shouldRenderCreate =
    mode === "create" &&
    (createBaseline === null || sections.length <= createBaseline);

  const shouldRenderEdit =
    mode === "edit" &&
    Boolean(
      selectedSectionId &&
      visibleSections.some((section) => section.id === selectedSectionId)
    ) &&
    !(activeTab === "archive" && archivedAnnouncements.length === 0);

  const selectedSection =
    shouldRenderEdit && selectedSectionId
      ? sortedSections.find((section) => section.id === selectedSectionId) ?? null
      : null;

  function openCreateMode() {
    setWorkspaceError(null);
    setActiveTab("moderation");
    setCreateBaseline(sections.length);
    setMode("create");
    setSelectedSectionId(null);
  }

  function openEditMode(sectionId: string) {
    setWorkspaceError(null);
    setMode("edit");
    setSelectedSectionId(sectionId);
  }

  function handleTabChange(tab: TabKey) {
    setWorkspaceError(null);
    setIsDeleteArchiveConfirmOpen(false);
    setActiveTab(tab);
    setMode("idle");
    setSelectedSectionId(null);
  }

  async function handleDeleteAllArchived() {
    if (!housePageId) {
      return;
    }

    setWorkspaceError(null);

    await dispatch(
      {
        type: "announcements.deleteAllArchived",
        houseId,
        payload: {},
      },
      {
        onSuccess: () => {
          setMode("idle");
          setSelectedSectionId(null);
        },
        onError: setWorkspaceError,
      },
    );
  }

  async function handleCopyToDraft(sectionId: string) {
    setWorkspaceError(null);
    setCopyingSectionId(sectionId);

    const copied = await dispatch(
      {
        type: "announcements.duplicate",
        houseId,
        payload: {
          sourceId: sectionId,
          targetHouseIds: [houseId],
        },
      },
      {
        onError: setWorkspaceError,
      },
    );

    setCopyingSectionId(null);

    if (!copied) return;

    setActiveTab("moderation");
    setMode("idle");
    setSelectedSectionId(null);
  }

  return (
    <div className={[adminSurfaceClass, "p-6"].join(" ")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cms-text)]">
            Оголошення будинку
          </h2>
          <p className={["mt-2", adminBodyClass].join(" ")}>
            Операційний екран сповіщень для мешканців.
          </p>
        </div>

        {housePageId ? (
          <button
            type="button"
            onClick={openCreateMode}
            className={[adminPrimaryButtonClass, "min-h-12 px-6"].join(" ")}
          >
            Нове оголошення
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <AdminSegmentedTabs
          activeKey={activeTab}
          onChange={(key) => handleTabChange(key as TabKey)}
          items={[
            {
              key: "active",
              label: "Активні оголошення",
              count: activeAnnouncements.length,
            },
            {
              key: "moderation",
              label: "Чернетки",
              count: moderationAnnouncements.length,
            },
            {
              key: "archive",
              label: "Архів",
              count: archivedAnnouncements.length,
            },
          ]}
        />

        {activeTab === "archive" &&
        archivedAnnouncements.length > 0 &&
        housePageId ? (
          <button
            type="button"
            disabled={isDeletingArchive}
            onClick={() => setIsDeleteArchiveConfirmOpen(true)}
            className={[adminDangerButtonClass, "disabled:opacity-60"].join(" ")}
          >
            {isDeletingArchive ? "Видаляємо архів..." : "Видалити все"}
          </button>
        ) : null}
      </div>

      {workspaceError ?? lastError ? (
        <div className="mt-6 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {workspaceError ?? lastError}
        </div>
      ) : null}

      <div className="mt-6">
        {shouldRenderCreate && housePageId ? (
          <CreateAnnouncementInlineForm
            houseId={houseId}
            houseSlug={houseSlug}
            housePageId={housePageId}
            onClose={closeWorkspace}
          />
        ) : null}

        {shouldRenderEdit && selectedSection ? (
          <div className={[adminInsetSurfaceClass, "p-5"].join(" ")}>
            {selectedSection.status !== "draft" ? (
              <div className="mb-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeletingArchive || copyingSectionId === selectedSection.id}
                  onClick={() => void handleCopyToDraft(selectedSection.id)}
                  className={[adminSecondaryButtonClass, "disabled:opacity-60"].join(" ")}
                >
                  {copyingSectionId === selectedSection.id
                    ? "Копіюємо..."
                    : "Копіювати в чернетку"}
                </button>

                <CrossHouseDuplicatePanel
                  houseId={houseId}
                  sourceId={selectedSection.id}
                  commandType="announcements.duplicate"
                  targets={duplicateTargets}
                  disabled={isDeletingArchive || copyingSectionId === selectedSection.id}
                />
              </div>
            ) : null}

            <EditAnnouncementSectionForm
              houseId={houseId}
              houseSlug={houseSlug}
              housePageId={housePageId}
              section={selectedSection}
              onClose={closeWorkspace}
            />
          </div>
        ) : null}
      </div>

      <PlatformConfirmModal
        open={isDeleteArchiveConfirmOpen}
        title="Видалити всі архівні оголошення?"
        description="Усі оголошення з архіву будуть безповоротно видалені із системи. Після цього відновити їх не вийде."
        confirmLabel="Видалити архів"
        pendingLabel="Видаляємо архів..."
        tone="destructive"
        isPending={isDeletingArchive}
        onCancel={() => {
          if (!isDeletingArchive) {
            setIsDeleteArchiveConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          setIsDeleteArchiveConfirmOpen(false);
          void handleDeleteAllArchived();
        }}
      />

      <div className="mt-6 space-y-4">
        {visibleSections.length > 0 ? (
          visibleSections.map((section, index) => {
            const level =
              typeof section.content.level === "string"
                ? section.content.level
                : "info";

            const bodyPreview = getPreviewText(section.content.body);
            const publishedAt = formatDateTime(section.content.publishedAt);
            const updatedAt = formatDateTime(section.content.updatedAt);
            const isSelected =
              mode === "edit" && selectedSectionId === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => openEditMode(section.id)}
                className={`block w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-[var(--cms-primary)] bg-[var(--cms-pill-bg)]"
                    : "border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface-muted)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${getLevelDotClasses(
                          level,
                        )}`}
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-[var(--cms-text-soft)]">
                        Оголошення #{index + 1}
                      </span>
                      <AdminStatusBadge tone={getStatusTone(section.status)}>
                        {getStatusLabel(section.status)}
                      </AdminStatusBadge>
                    </div>

                    <div className="truncate text-base font-semibold text-[var(--cms-text)]">
                      {section.title ?? "Оголошення без заголовка"}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                      {bodyPreview}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-full border border-[var(--cms-border-strong)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                    {getLevelLabel(level)}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-[var(--cms-text-soft)] sm:grid-cols-2">
                  <div>Опубліковано: {publishedAt}</div>
                  <div>Оновлено: {updatedAt}</div>
                </div>
              </button>
            );
          })
        ) : (
          <div className={adminEmptyStateClass}>
            {activeTab === "active"
              ? "Зараз немає активних оголошень для мешканців. Після підтвердження вони відображатимуться тут."
              : activeTab === "moderation"
                ? "Чернеток поки немає. Створи нове оголошення, щоб почати роботу."
                : "Архів оголошень поки порожній."}
          </div>
        )}
      </div>
    </div>
  );
}
