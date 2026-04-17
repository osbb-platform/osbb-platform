"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreateAnnouncementInlineForm } from "@/src/modules/houses/components/CreateAnnouncementInlineForm";
import { EditAnnouncementSectionForm } from "@/src/modules/houses/components/EditAnnouncementSectionForm";
import { deleteArchivedHouseAnnouncements } from "@/src/modules/houses/actions/deleteArchivedHouseAnnouncements";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";

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

function getStatusBadgeClasses(status: AnnouncementItem["status"]) {
  if (status === "published") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "in_review") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "archived") {
    return "bg-slate-700 text-slate-200 border border-slate-600";
  }

  return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
}

function getLevelLabel(level: string) {
  if (level === "danger") return "Важное";
  if (level === "warning") return "Обратить внимание";
  return "Обычное";
}

function getLevelDotClasses(level: string) {
  if (level === "danger") return "bg-red-400";
  if (level === "warning") return "bg-amber-400";
  return "bg-slate-400";
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

  useEffect(() => {
    if (
      mode === "edit" &&
      selectedSectionId &&
      !sections.some((section) => section.id === selectedSectionId)
    ) {
      closeWorkspace();
    }
  }, [sections, mode, selectedSectionId]);

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

  function closeWorkspace() {
    setWorkspaceError(null);
    setIsDeleteArchiveConfirmOpen(false);
    setCreateBaseline(null);
    setMode("idle");
    setSelectedSectionId(null);
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

        closeWorkspace();
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
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Объявления дома
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Операционный экран уведомлений для жильцов.
          </p>
        </div>

        {housePageId ? (
          <button
            type="button"
            onClick={openCreateMode}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Новое объявление
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {[
            ["active", "Активные объявления", activeAnnouncements.length],
            ["moderation", "Черновики", moderationAnnouncements.length],
            ["archive", "Архив", archivedAnnouncements.length],
          ].map(([key, label, count]) => {
            const isActive = key === activeTab;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key as TabKey)}
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

        {activeTab === "archive" &&
        archivedAnnouncements.length > 0 &&
        housePageId ? (
          <button
            type="button"
            disabled={isDeletingArchive}
            onClick={() => setIsDeleteArchiveConfirmOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl border border-red-900 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
          >
            {isDeletingArchive ? "Удаляем архив..." : "Удалить все"}
          </button>
        ) : null}
      </div>

      {workspaceError ? (
        <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
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
                    ? "border-white bg-slate-800"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/70"
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
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Объявление #{index + 1}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          section.status,
                        )}`}
                      >
                        {getStatusLabel(section.status)}
                      </span>
                    </div>

                    <div className="truncate text-base font-semibold text-white">
                      {section.title ?? "Объявление без заголовка"}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      {bodyPreview}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                    {getLevelLabel(level)}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div>Опубликовано: {publishedAt}</div>
                  <div>Обновлено: {updatedAt}</div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-sm leading-6 text-slate-400">
            {activeTab === "active"
              ? "Сейчас нет активных объявлений для жильцов. После подтверждения они будут отображаться здесь."
              : activeTab === "moderation"
                ? "Сейчас нет черновиков объявлений. Новое объявление появится здесь сразу после сохранения."
                : "Архив объявлений пока пуст. Перенесенные из активных объявления будут отображаться здесь."}
          </div>
        )}
      </div>
    </div>
  );
}
