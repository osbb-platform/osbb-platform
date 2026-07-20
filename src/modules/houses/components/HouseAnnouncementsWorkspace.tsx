"use client";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import {
  ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";

import { useMemo,
  useState } from "react";
import { CreateAnnouncementInlineForm } from "@/src/modules/houses/components/CreateAnnouncementInlineForm";
import { EditAnnouncementSectionForm } from "@/src/modules/houses/components/EditAnnouncementSectionForm";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import {
  AdminStatusBadge,
  statusLabelFor,
  statusToneFor,
  } from "@/src/shared/ui/admin/AdminStatusBadge";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";
import { formatAdminDateTime } from "@/src/shared/utils/format/formatAdminDate";
import {
  adminBodyClass,
  adminInsetSurfaceClass,
  adminSurfaceClass,
  adminButtonClasses,
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
  const { dispatch, isPending: isDeletingArchive } = useAdminContentCommand();
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

        <button
          type="button"
          onClick={openCreateMode}
          className={[adminButtonClasses({ variant: "primary" }), "min-h-12 px-6"].join(" ")}
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
            className={[adminButtonClasses({ variant: "danger" }), "disabled:opacity-60"].join(" ")}
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

      <div className="mt-6">
        {shouldRenderCreate ? (
          <CreateAnnouncementInlineForm
            houseId={houseId}
            houseSlug={houseSlug}
            housePageId={housePageId ?? ""}
            onClose={closeWorkspace}
          />
        ) : null}

        {shouldRenderEdit && selectedSection ? (
          <div className={[adminInsetSurfaceClass, "p-5"].join(" ")}>
            <EditAnnouncementSectionForm
              headerActions={
                selectedSection.status !== "draft" ? (
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
                ) : null
              }
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
            const publishedAt = formatAdminDateTime(section.content.publishedAt);
            const updatedAt = formatAdminDateTime(section.content.updatedAt);
            const isSelected =
              mode === "edit" && selectedSectionId === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => openEditMode(section.id)}
                className={`block w-full rounded-[var(--r-lg)] border p-4 text-left transition ${
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
                      <AdminStatusBadge tone={statusToneFor(section.status)}>
                        {statusLabelFor(section.status)}
                      </AdminStatusBadge>
                    </div>

                    <div className="truncate text-base font-semibold text-[var(--cms-text)]">
                      {section.title ?? "Оголошення без заголовка"}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                      {bodyPreview}
                    </div>

                    {hasAnnouncementPdf(section.content) ? (
                      <div className="mt-3 inline-flex items-center rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                        PDF додано
                      </div>
                    ) : null}
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
          <EmptyState
            title="Оголошень поки немає"
            description="Створіть перше оголошення або секцію, щоб вона зʼявилася у списку."
          />
        )}
      </div>
    </div>
  );
}
