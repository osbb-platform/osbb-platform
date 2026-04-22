"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreateAnnouncementInlineForm } from "@/src/modules/houses/components/CreateAnnouncementInlineForm";
import { EditAnnouncementSectionForm } from "@/src/modules/houses/components/EditAnnouncementSectionForm";
import { deleteArchivedHouseAnnouncements } from "@/src/modules/houses/actions/deleteArchivedHouseAnnouncements";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import {
  adminBodyClass,
  adminDangerButtonClass,
  adminEmptyStateClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
  
  adminSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

type AnnouncementItem = {
  id: string;
  title: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};

type HouseAnnouncementsWorkspaceProps = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  sections: AnnouncementItem[];
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
    return "Не опубликовано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Не опубликовано";
  }

  return date.toLocaleString("ru-RU");
}

function getStatusLabel(status: AnnouncementItem["status"]) {
  if (status === "published") return "Опубликовано";
  if (status === "in_review") return "Черновик";
  if (status === "archived") return "Архив";
  return "Черновик";
}

function getStatusTone(
  status: AnnouncementItem["status"],
): "success" | "warning" | "neutral" | "info" {
  if (status === "published") return "success";
  if (status === "in_review") return "warning";
  if (status === "archived") return "neutral";
  return "info";
}

function getLevelLabel(level: string) {
  if (level === "danger") return "Важное";
  if (level === "warning") return "Обратить внимание";
  return "Обычное";
}

function getLevelDotClasses(level: string) {
  if (level === "danger") return "bg-red-400";
  if (level === "warning") return "bg-amber-400";
  return "bg-[#85e874]";
}

function getPreviewText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Объявление без текста.";
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
}: HouseAnnouncementsWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [mode, setMode] = useState<WorkspaceMode>("idle");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isDeleteArchiveConfirmOpen, setIsDeleteArchiveConfirmOpen] = useState(false);
  const [isDeletingArchive, startDeleteArchiveTransition] = useTransition();

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
      section.status === "draft" || section.status === "in_review",
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

  function handleDeleteAllArchived() {
    if (!housePageId) {
      return;
    }

    setWorkspaceError(null);

    startDeleteArchiveTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("houseId", houseId);
        formData.set("houseSlug", houseSlug);
        formData.set("housePageId", housePageId);

        const result = await deleteArchivedHouseAnnouncements(formData);

        if (result.error) {
          setWorkspaceError(result.error);
          return;
        }

        setMode("idle");
        setSelectedSectionId(null);
        router.refresh();
      } catch (error) {
        setWorkspaceError(
          error instanceof Error
            ? error.message
            : "Не удалось удалить архивные объявления.",
        );
      }
    });
  }

  return (
    <div className={[adminSurfaceClass, "p-6"].join(" ")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cms-text)]">
            Объявления дома
          </h2>
          <p className={["mt-2", adminBodyClass].join(" ")}>
            Операционный экран уведомлений для жильцов.
          </p>
        </div>

        {housePageId ? (
          <button
            type="button"
            onClick={openCreateMode}
            className={[adminPrimaryButtonClass, "min-h-12 px-6"].join(" ")}
          >
            Новое объявление
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
              label: "Активные объявления",
              count: activeAnnouncements.length,
            },
            {
              key: "moderation",
              label: "Черновики",
              count: moderationAnnouncements.length,
            },
            {
              key: "archive",
              label: "Архив",
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
            {isDeletingArchive ? "Удаляем архив..." : "Удалить все"}
          </button>
        ) : null}
      </div>

      {workspaceError ? (
        <div className="mt-6 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {workspaceError}
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
        title="Удалить все архивные объявления?"
        description="Все объявления из архива будут безвозвратно удалены из системы. После этого восстановить их не получится."
        confirmLabel="Удалить архив"
        pendingLabel="Удаляем архив..."
        tone="destructive"
        isPending={isDeletingArchive}
        onCancel={() => {
          if (!isDeletingArchive) {
            setIsDeleteArchiveConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          setIsDeleteArchiveConfirmOpen(false);
          handleDeleteAllArchived();
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
                        Объявление #{index + 1}
                      </span>
                      <AdminStatusBadge tone={getStatusTone(section.status)}>
                        {getStatusLabel(section.status)}
                      </AdminStatusBadge>
                    </div>

                    <div className="truncate text-base font-semibold text-[var(--cms-text)]">
                      {section.title ?? "Объявление без заголовка"}
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
                  <div>Опубликовано: {publishedAt}</div>
                  <div>Обновлено: {updatedAt}</div>
                </div>
              </button>
            );
          })
        ) : (
          <div className={adminEmptyStateClass}>
            {activeTab === "active"
              ? "Сейчас нет активных объявлений для жильцов. После подтверждения они будут отображаться здесь."
              : activeTab === "moderation"
                ? "Черновиков пока нет. Создай новое объявление, чтобы начать работу."
                : "Архив объявлений пока пуст."}
          </div>
        )}
      </div>
    </div>
  );
}
