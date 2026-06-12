"use client";

import { CrossHouseDuplicatePanel, type CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";

import { useState } from "react";
import type { HouseDocumentListItem } from "@/src/modules/houses/services/getHouseDocuments";
import type { HouseInformationPostSnapshot } from "@/src/modules/houses/services/getAdminHouseInformationPosts";
import type { HouseFaqSnapshot } from "@/src/modules/houses/services/getAdminHouseFaq";
import { CreateInformationPostInlineForm } from "@/src/modules/houses/components/CreateInformationPostInlineForm";
import { EditInformationFaqForm } from "@/src/modules/houses/components/EditInformationFaqForm";
import { EditInformationPostForm } from "@/src/modules/houses/components/EditInformationPostForm";
import { HouseDocumentsWorkspace } from "@/src/modules/houses/components/HouseDocumentsWorkspace";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";

export const INFORMATION_CATEGORIES = [
  "Про будинок",
  "Правила проживання",
  "Корисна інформація",
  "Контакти служб",
  "Інструкції для мешканців",
] as const;

type InformationMainTab = "posts" | "faq" | "materials";
type PostWorkspaceMode = "idle" | "create" | "edit";

type InformationSectionItem = HouseInformationPostSnapshot;

type Props = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  posts: InformationSectionItem[];
  faq: HouseFaqSnapshot | null;
  documents: HouseDocumentListItem[];
  duplicateTargets?: CrossHouseDuplicateTarget[];
};

function getPostDate(content: Record<string, unknown>) {
  const publishedAt =
    typeof content.publishedAt === "string" ? content.publishedAt : null;
  const createdAt =
    typeof content.createdAt === "string" ? content.createdAt : null;

  return publishedAt ?? createdAt ?? "";
}

function formatDate(value: string) {
  if (!value) return "Дату не вказано";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дату не вказано";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function HouseInformationWorkspace({
  houseId,
  houseSlug,
  housePageId,
  posts,
  faq,
  documents,
  duplicateTargets = [],
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const [mainTab, setMainTab] = useState<InformationMainTab>("posts");
  const [workspaceMode, setWorkspaceMode] = useState<PostWorkspaceMode>("idle");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [materialsCreateKey, setMaterialsCreateKey] = useState(0);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [copyingPostId, setCopyingPostId] = useState<string | null>(null);

  const visiblePosts = posts
    .slice()
    .sort((left, right) => {
      const leftPinned = Boolean(left.content.isPinned);
      const rightPinned = Boolean(right.content.isPinned);

      if (leftPinned !== rightPinned) {
        return Number(rightPinned) - Number(leftPinned);
      }

      return getPostDate(right.content).localeCompare(getPostDate(left.content));
    });

  const editingPost =
    workspaceMode === "edit"
      ? posts.find((item) => item.id === editingSectionId) ?? null
      : null;

  function openCreatePost() {
    setWorkspaceError(null);
    setWorkspaceMode("create");
    setEditingSectionId(null);
    setFaqOpen(false);
  }

  function openEditPost(sectionId: string) {
    setWorkspaceError(null);
    setWorkspaceMode("edit");
    setEditingSectionId(sectionId);
    setFaqOpen(false);
  }

  function closePostWorkspace() {
    setWorkspaceError(null);
    setWorkspaceMode("idle");
    setEditingSectionId(null);
  }

  async function handleCopyPostToDraft(sectionId: string) {
    setWorkspaceError(null);
    setCopyingPostId(sectionId);

    const copied = await dispatch(
      {
        type: "information_posts.duplicate",
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

    setCopyingPostId(null);

    if (!copied) return;

    setWorkspaceMode("idle");
    setEditingSectionId(null);
  }


  function openFaqWorkspace() {
    setFaqOpen(true);
    closePostWorkspace();
  }

  function openCreateDocument() {
    setMaterialsCreateKey((prev) => prev + 1);
    closePostWorkspace();
    closeFaqWorkspace();
    setMainTab("materials");
  }

  function closeFaqWorkspace() {
    setFaqOpen(false);
  }

  function handleMainTabChange(nextTab: InformationMainTab) {
    setMainTab(nextTab);
    closePostWorkspace();
    closeFaqWorkspace();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Інформація будинку
              </h2>
              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Керування статтями, FAQ і PDF-матеріалами для мешканців.
              </p>
            </div>

            <div>
              {mainTab === "posts" ? (
            <button
              type="button"
              onClick={openCreatePost}
              disabled={!housePageId}
              className={[adminPrimaryButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
            >
              Нова стаття
            </button>
          ) : null}

              {mainTab === "materials" ? (
            <button
              type="button"
              onClick={openCreateDocument}
              className={adminPrimaryButtonClass}
            >
              Новий матеріал
            </button>
          ) : null}

              {mainTab === "faq" ? (
            <button
              type="button"
              onClick={openFaqWorkspace}
              disabled={!faq}
              className={[adminPrimaryButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
            >
              Редагувати FAQ
            </button>
          ) : null}
            </div>
          </div>

          <div className="mt-2">
            <AdminSegmentedTabs
              activeKey={mainTab}
              onChange={(key) => handleMainTabChange(key as typeof mainTab)}
              items={[
                {
                  key: "posts",
                  label: "Інформація",
                  count: posts.length,
                },
                {
                  key: "faq",
                  label: "FAQ",
                  count: faq?.items.length ?? 0,
                },
                {
                  key: "materials",
                  label: "Матеріали",
                  count: documents.length,
                },
              ]}
            />
          </div>
        </div>
      </div>

      {mainTab === "posts" ? (
        <>

          {workspaceMode === "create" ? (
            <CreateInformationPostInlineForm
              houseId={houseId}
              houseSlug={houseSlug}
              housePageId={housePageId}
              onClose={closePostWorkspace}
            />
          ) : null}

          {workspaceError ?? lastError ? (
            <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
              {workspaceError ?? lastError}
            </div>
          ) : null}

          {workspaceMode === "edit" && editingPost ? (
            <div className="space-y-4">
              {editingPost.status !== "draft" ? (
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={isPending || copyingPostId === editingPost.id}
                    onClick={() => void handleCopyPostToDraft(editingPost.id)}
                    className={[adminSecondaryButtonClass, "disabled:opacity-60"].join(" ")}
                  >
                    {copyingPostId === editingPost.id
                      ? "Копіюємо..."
                      : "Копіювати в чернетку"}
                  </button>

                  <CrossHouseDuplicatePanel
                    houseId={houseId}
                    sourceId={editingPost.id}
                    commandType="information_posts.duplicate"
                    targets={duplicateTargets}
                    disabled={isPending || copyingPostId === editingPost.id}
                  />
                </div>
              ) : null}

              <EditInformationPostForm
                houseId={houseId}
                houseSlug={houseSlug}
                section={editingPost}
                onClose={closePostWorkspace}
              />
            </div>
          ) : null}

          <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
            <div className="space-y-4">
              {visiblePosts.length > 0 ? (
                visiblePosts.map((section) => {
                  const content = section.content;
                  const category =
                    typeof content.category === "string"
                      ? content.category
                      : "Без фільтра";
                  const body =
                    typeof content.body === "string" ? content.body : "";
                  const preview =
                    body.length > 170 ? `${body.slice(0, 170).trim()}…` : body;
                  const isPinned = Boolean(content.isPinned);

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => openEditPost(section.id)}
                      className={`block w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
                        isPinned
                          ? "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)]"
                          : "border-[var(--cms-border)] bg-[var(--cms-surface-muted)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
                              {category}
                            </span>
                            <span className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
                              {formatDate(getPostDate(content))}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                section.status === "published"
                                  ? "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]"
                                  : "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
                              }`}
                            >
                              {section.status === "published" ? "Активна" : "Чернетка"}
                            </span>
                            {Boolean(content.isPinned) ? (
                              <span className="inline-flex rounded-full border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--cms-success-text)]">
                                PIN
                              </span>
                            ) : null}
                          </div>

                          <div className="text-base font-semibold text-[var(--cms-text)]">
                            {section.title || "Без заголовка"}
                          </div>

                          <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                            {preview || "Текст повідомлення поки не заповнено"}
                          </div>
                        </div>

                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
                  Повідомлень поки немає. Створи першу публікацію через кнопку зверху.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {mainTab === "materials" ? (
        <HouseDocumentsWorkspace
          key={`materials-${materialsCreateKey}`}
          houseId={houseId}
          documents={documents}
          startInCreateMode={materialsCreateKey > 0}
          duplicateTargets={duplicateTargets}
          embedded
        />
      ) : null}

      {mainTab === "faq" ? (
        <>
          {!faqOpen ? (
            <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
              {faq ? (
                <button
                  type="button"
                  onClick={openFaqWorkspace}
                  className="block w-full rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 text-left transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface-elevated)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        faq.status === "published"
                          ? "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]"
                          : faq.status === "archived"
                            ? "border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]"
                            : "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
                      }`}
                    >
                      {faq.status === "published"
                        ? "Активна"
                        : faq.status === "archived"
                          ? "Архів"
                          : "Чернетка"}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
                      Запитань: {faq.items.length}
                    </span>
                  </div>

                  <div className="mt-3 text-base font-semibold text-[var(--cms-text)]">
                    FAQ для мешканців
                  </div>
                </button>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
                  FAQ поки не створено. Онови сторінку або перевір міграцію content-engine.
                </div>
              )}
            </div>
          ) : null}

          {faqOpen && faq ? (
            <EditInformationFaqForm
              houseId={houseId}
              faq={faq}
              onClose={closeFaqWorkspace}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
