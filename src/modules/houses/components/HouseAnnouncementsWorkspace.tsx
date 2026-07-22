"use client";

import { useWorkspaceMemory } from "@/src/shared/hooks/useWorkspaceMemory";
import { WorkspaceListToolbar } from "@/src/modules/houses/components/WorkspaceListToolbar";
import { WorkspaceViewToggle, type WorkspaceViewMode } from "@/src/modules/houses/components/WorkspaceViewToggle";
import { filterAndSortWorkspaceItems, type WorkspaceListSortMode } from "@/src/modules/houses/utils/workspaceList";

import { useMemo, useState } from "react";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";
import { CreateAnnouncementInlineForm } from "@/src/modules/houses/components/CreateAnnouncementInlineForm";
import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { EditAnnouncementSectionForm } from "@/src/modules/houses/components/EditAnnouncementSectionForm";
import { useDirtyGuard } from "@/src/shared/hooks/useDirtyGuard";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import {
  AdminStatusBadge,
  statusLabelFor,
  statusToneFor,
} from "@/src/shared/ui/admin/AdminStatusBadge";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";
import {
  adminBodyClass,
  adminButtonClasses,
  adminSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";
import { formatAdminDateTime } from "@/src/shared/utils/format/formatAdminDate";

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
  const candidates = [content.publishedAt, content.updatedAt, content.createdAt];

  for (const value of candidates) {
    if (typeof value === "string" && value) {
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) return time;
    }
  }

  return 0;
}

function getLevelLabel(level: string) {
  if (level === "danger") return "Важливе";
  if (level === "warning") return "Звернути увагу";
  return "Звичайне";
}

function getLevelDotClasses(level: string) {
  if (level === "danger") return "bg-[var(--cms-danger-text)]";
  if (level === "warning") return "bg-[var(--cms-warning-text)]";
  return "bg-[var(--cms-success-bg)]";
}

function hasAnnouncementPdf(content: Record<string, unknown>) {
  const pdf = content.pdf;

  return Boolean(
    pdf &&
      typeof pdf === "object" &&
      typeof (pdf as { path?: unknown }).path === "string" &&
      (pdf as { path: string }).path.trim(),
  );
}

function getPreviewText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Оголошення без тексту.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 140
    ? normalized
    : `${normalized.slice(0, 140).trim()}…`;
}

export function HouseAnnouncementsWorkspace({
  houseId,
  houseSlug,
  housePageId,
  sections,
  duplicateTargets = [],
}: HouseAnnouncementsWorkspaceProps) {
  const { dispatch, isPending: isDeletingArchive } = useAdminContentCommand();
  const [activeTab, setActiveTab] = useWorkspaceMemory<TabKey>(
    "announcements",
    "activeTab",
    "active",
    ["active", "moderation", "archive"],
  );
  const [searchQuery, setSearchQuery] =
    useWorkspaceMemory("announcements", "searchQuery", "");
  const [sortMode, setSortMode] =
    useWorkspaceMemory<WorkspaceListSortMode>(
      "announcements",
      "sortMode",
      "newest",
      ["newest", "oldest", "title_asc"],
    );
  const [viewMode, setViewMode] = useWorkspaceMemory<WorkspaceViewMode>(
    "announcements",
    "viewMode",
    "rows",
    ["rows", "grid"],
  );
  const [visibleCount, setVisibleCount] = useState(20);
  const [mode, setMode] = useState<WorkspaceMode>("idle");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [copyingSectionId, setCopyingSectionId] = useState<string | null>(null);
  const [isDeleteArchiveConfirmOpen, setIsDeleteArchiveConfirmOpen] =
    useState(false);
  const [panelDirty, setPanelDirty] = useState(false);
  const dirtyGuard = useDirtyGuard({ isDirty: panelDirty });

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      const aTime = getSortTimestamp(a.content);
      const bTime = getSortTimestamp(b.content);
      return bTime !== aTime ? bTime - aTime : a.id.localeCompare(b.id);
    });
  }, [sections]);

  const activeAnnouncements = sortedSections.filter(
    (section) => section.status === "published",
  );
  const moderationAnnouncements = sortedSections.filter(
    (section) => section.status === "draft",
  );
  const archivedAnnouncements = sortedSections.filter(
    (section) => section.status === "archived",
  );

  const tabMap = {
    active: activeAnnouncements,
    moderation: moderationAnnouncements,
    archive: archivedAnnouncements,
  };

  const baseVisibleSections = tabMap[activeTab];
  const visibleSections = useMemo(
    () =>
      filterAndSortWorkspaceItems(
        baseVisibleSections,
        searchQuery,
        sortMode,
      ),
    [baseVisibleSections, searchQuery, sortMode],
  );
  const selectedSection = selectedSectionId
    ? sortedSections.find((section) => section.id === selectedSectionId) ?? null
    : null;
  const panelOpen =
    mode === "create" || (mode === "edit" && Boolean(selectedSection));

  function closeWorkspaceNow() {
    setWorkspaceError(null);
    setPanelDirty(false);
    setMode("idle");
    setSelectedSectionId(null);
  }

  function requestCloseWorkspace() {
    dirtyGuard.request(closeWorkspaceNow);
  }

  function openCreateMode() {
    dirtyGuard.request(() => {
      setWorkspaceError(null);
      setPanelDirty(false);
      setActiveTab("moderation");
      setMode("create");
      setSelectedSectionId(null);
    });
  }

  function openEditMode(sectionId: string) {
    dirtyGuard.request(() => {
      setWorkspaceError(null);
      setPanelDirty(false);
      setMode("edit");
      setSelectedSectionId(sectionId);
    });
  }

  function handleTabChange(tab: TabKey) {
    dirtyGuard.request(() => {
      setWorkspaceError(null);
      setPanelDirty(false);
      setIsDeleteArchiveConfirmOpen(false);
      setActiveTab(tab);
      setMode("idle");
      setSelectedSectionId(null);
    });
  }

  async function handleDeleteAllArchived() {
    if (!housePageId) return;

    setWorkspaceError(null);

    await dispatch(
      {
        type: "announcements.deleteAllArchived",
        houseId,
        payload: {},
      },
      {
        onSuccess: closeWorkspaceNow,
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

    setPanelDirty(false);
    setActiveTab("moderation");
    setMode("idle");
    setSelectedSectionId(null);
  }

  const panelTitle =
    mode === "create"
      ? "Нове оголошення"
      : selectedSection?.title ?? "Оголошення без заголовка";

  const panelDescription =
    mode === "create" ? (
      "Нове оголошення буде створено як чернетка."
    ) : selectedSection ? (
      <div className="flex flex-wrap items-center gap-3">
        <AdminStatusBadge tone={statusToneFor(selectedSection.status)}>
          {statusLabelFor(selectedSection.status)}
        </AdminStatusBadge>
        <span>
          Оновлено: {formatAdminDateTime(selectedSection.content.updatedAt)}
        </span>
        {selectedSection.status !== "draft" ? (
          <ContentWorkspaceActionButtons
            houseId={houseId}
            sourceId={selectedSection.id}
            commandType="announcements.duplicate"
            duplicateTargets={duplicateTargets}
            disabled={isDeletingArchive}
            isCopying={copyingSectionId === selectedSection.id}
            onCopy={() => handleCopyToDraft(selectedSection.id)}
            duplicatePanelTitle="Копії оголошення в інші будинки"
          />
        ) : null}
      </div>
    ) : null;

  return (
    <>
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

          <button
            type="button"
            onClick={openCreateMode}
            className={[
              adminButtonClasses({ variant: "primary" }),
              "min-h-12 px-6",
            ].join(" ")}
          >
            Нове оголошення
          </button>
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
              className={[
                adminButtonClasses({ variant: "danger" }),
                "disabled:opacity-60",
              ].join(" ")}
            >
              {isDeletingArchive ? "Видаляємо архів..." : "Видалити все"}
            </button>
          ) : null}
        </div>

        {workspaceError ? (
          <div className="mt-6 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {workspaceError}
          </div>
        ) : null}

        <div
          className={[
            "mt-6 grid gap-3",
            viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
          ].join(" ")}
        >
          <WorkspaceListToolbar
            className="col-span-full"
            searchQuery={searchQuery}
            sortMode={sortMode}
            visible={visibleCount}
            total={visibleSections.length}
            searchPlaceholder="Назва або текст оголошення"
            onSearchChange={(value) => {
              setSearchQuery(value);
              setVisibleCount(20);
            }}
            onSortChange={(value) => {
              setSortMode(value);
              setVisibleCount(20);
            }}
            onShowMore={() => setVisibleCount((current) => current + 20)}
            trailingControls={<WorkspaceViewToggle value={viewMode} onChange={setViewMode} />}
          />

          {visibleSections.length > 0 ? (
            visibleSections.slice(0, visibleCount).map((section) => {
              const level =
                typeof section.content.level === "string"
                  ? section.content.level
                  : "info";
              const bodyPreview = getPreviewText(section.content.body);
              const publishedAt = formatAdminDateTime(
                section.content.publishedAt,
              );
              const updatedAt = formatAdminDateTime(section.content.updatedAt);
              const isSelected =
                mode === "edit" && selectedSectionId === section.id;

              return (
                <div
                  key={section.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEditMode(section.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEditMode(section.id);
                    }
                  }}
                  className={`group cursor-pointer rounded-[var(--r-lg)] border p-4 transition ${
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
                        <AdminStatusBadge tone={statusToneFor(section.status)}>
                          {statusLabelFor(section.status)}
                        </AdminStatusBadge>
                        <span className="rounded-[var(--r-pill)] border border-[var(--cms-border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                          {getLevelLabel(level)}
                        </span>
                        {hasAnnouncementPdf(section.content) ? (
                          <span className="rounded-[var(--r-pill)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                            PDF додано
                          </span>
                        ) : null}
                      </div>

                      <div className="truncate text-base font-semibold text-[var(--cms-text)]">
                        {section.title ?? "Оголошення без заголовка"}
                      </div>

                      <div className="mt-2 truncate text-sm text-[var(--cms-text-muted)]">
                        {bodyPreview}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--cms-text-soft)]">
                    <span>Опубліковано: {publishedAt}</span>
                    <span>Оновлено: {updatedAt}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              title="Оголошень поки немає"
              description="Створіть перше оголошення або секцію, щоб вона зʼявилася у списку."
              action={
                !String(activeTab).startsWith("archiv") && housePageId ? (
                  <button
                    type="button"
                    onClick={openCreateMode}
                    className={adminButtonClasses({ variant: "primary" })}
                  >
                    Створити оголошення
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      <AdminSidePanel
        title={panelTitle}
        description={panelDescription}
        isOpen={panelOpen}
        onClose={requestCloseWorkspace}
      >
        {mode === "create" ? (
          <CreateAnnouncementInlineForm
            houseId={houseId}
            houseSlug={houseSlug}
            housePageId={housePageId ?? ""}
            onClose={closeWorkspaceNow}
            onDirtyChange={setPanelDirty}
          />
        ) : null}

        {mode === "edit" && selectedSection ? (
          <EditAnnouncementSectionForm
            houseId={houseId}
            houseSlug={houseSlug}
            housePageId={housePageId}
            section={selectedSection}
            onClose={closeWorkspaceNow}
            onDirtyChange={setPanelDirty}
          />
        ) : null}
      </AdminSidePanel>

      <PlatformConfirmModal
        open={dirtyGuard.confirmOpen}
        title="Є незбережені зміни"
        description="Якщо продовжити, внесені зміни буде втрачено."
        confirmLabel="Вийти без збереження"
        cancelLabel="Продовжити редагування"
        tone="warning"
        onCancel={dirtyGuard.cancel}
        onConfirm={dirtyGuard.discardAndContinue}
      />

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
    </>
  );
}
