"use client";

import {
  AdminStatusBadge,
  statusLabelFor,
  statusToneFor } from "@/src/shared/ui/admin/AdminStatusBadge";

import { formatAdminDate } from "@/src/shared/utils/format/formatAdminDate";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";
import {
  ContentTemplateSlotsPanel,
  type ContentTemplateSlot,
  } from "@/src/modules/houses/components/ContentTemplateSlotsPanel";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";

import { useState } from "react";
import type { HouseDocumentListItem } from "@/src/modules/houses/services/getHouseDocuments";
import type { HouseInformationPostSnapshot } from "@/src/modules/houses/services/getAdminHouseInformationPosts";
import type { HouseFaqSnapshot } from "@/src/modules/houses/services/getAdminHouseFaq";
import { CreateInformationPostInlineForm } from "@/src/modules/houses/components/CreateInformationPostInlineForm";
import { CreateInformationFaqForm } from "@/src/modules/houses/components/CreateInformationFaqForm";
import { EditInformationFaqForm } from "@/src/modules/houses/components/EditInformationFaqForm";
import { EditInformationPostForm } from "@/src/modules/houses/components/EditInformationPostForm";
import { HouseDocumentsWorkspace } from "@/src/modules/houses/components/HouseDocumentsWorkspace";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import {
  adminButtonClasses,
} from "@/src/shared/ui/admin/adminStyles";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { TemplateIcon } from "@/src/shared/ui/icons/AdminInlineIcons";

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
  faqs: HouseFaqSnapshot[];
  documents: HouseDocumentListItem[];
  faqTemplates?: ContentTemplateSlot[];
  informationPostTemplates?: ContentTemplateSlot[];
  duplicateTargets?: CrossHouseDuplicateTarget[];
};

function getPostDate(content: Record<string, unknown>) {
  const publishedAt =
    typeof content.publishedAt === "string" ? content.publishedAt : null;
  const createdAt =
    typeof content.createdAt === "string" ? content.createdAt : null;

  return publishedAt ?? createdAt ?? "";
}

export function HouseInformationWorkspace({
  houseId,
  houseSlug,
  housePageId,
  posts,
  faqs,
  documents,
  faqTemplates = [],
  informationPostTemplates = [],
  duplicateTargets = [],
}: Props) {
  const { dispatch, isPending } = useAdminContentCommand();
  const [mainTab, setMainTab] = useState<InformationMainTab>("posts");
  const [workspaceMode, setWorkspaceMode] = useState<PostWorkspaceMode>("idle");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCreateOpen, setFaqCreateOpen] = useState(false);
  const [materialsCreateKey, setMaterialsCreateKey] = useState(0);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [copyingPostId, setCopyingPostId] = useState<string | null>(null);
  const [applyingPostsTemplate, setApplyingPostsTemplate] = useState(false);
  const [applyingFaqTemplate, setApplyingFaqTemplate] = useState(false);
  const [postTemplatesPanelOpen, setPostTemplatesPanelOpen] = useState(false);
  const [faqTemplatesPanelOpen, setFaqTemplatesPanelOpen] = useState(false);

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

  const visibleFaqs = faqs.slice();

  const editingPost =
    workspaceMode === "edit"
      ? posts.find((item) => item.id === editingSectionId) ?? null
      : null;

  const editingFaq = editingFaqId
    ? faqs.find((item) => item.id === editingFaqId) ?? null
    : null;

  function openCreatePost() {
    setWorkspaceError(null);
    setWorkspaceMode("create");
    setEditingSectionId(null);
    setEditingFaqId(null);
  }

  function openEditPost(sectionId: string) {
    setWorkspaceError(null);
    setWorkspaceMode("edit");
    setEditingSectionId(sectionId);
    setEditingFaqId(null);
  }

  function closePostWorkspace() {
    setWorkspaceError(null);
    setWorkspaceMode("idle");
    setEditingSectionId(null);
  }

  async function applyInformationTemplateKeys(templateKeys: string[]) {
    setWorkspaceError(null);
    setApplyingPostsTemplate(true);

    for (const templateKey of templateKeys) {
      const applied = await dispatch(
        {
          type: "information_posts.applyTemplate",
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
        setApplyingPostsTemplate(false);
        return false;
      }
    }

    setApplyingPostsTemplate(false);
    setPostTemplatesPanelOpen(false);
    setMainTab("posts");
    closePostWorkspace();
    closeFaqWorkspace();
    return true;
  }

  async function applyFaqTemplateKeys(templateKeys: string[]) {
    setWorkspaceError(null);
    setApplyingFaqTemplate(true);

    const templateKey = templateKeys[0];

    if (!templateKey) {
      setWorkspaceError("Оберіть шаблон FAQ.");
      setApplyingFaqTemplate(false);
      return false;
    }

    const applied = await dispatch<HouseFaqSnapshot>(
      {
        type: "faq.applyTemplate",
        houseId,
        payload: {
          templateKey,
        },
      },
      {
        successMessage: "FAQ-чернетку створено з шаблону",
        onError: setWorkspaceError,
        onSuccess(data) {
          const created = data as HouseFaqSnapshot | undefined;
          setFaqTemplatesPanelOpen(false);
          setMainTab("faq");
          closePostWorkspace();
          setEditingFaqId(created?.id ?? null);
        },
      },
    );

    if (!applied) {
      setApplyingFaqTemplate(false);
      return false;
    }

    setApplyingFaqTemplate(false);
    return true;
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

  function openCreateFaqForm() {
    setWorkspaceError(null);
    setMainTab("faq");
    closePostWorkspace();
    setEditingFaqId(null);
    setFaqCreateOpen(true);
  }

  function openFaqWorkspace(faqId: string) {
    setWorkspaceError(null);
    setFaqCreateOpen(false);
    setEditingFaqId(faqId);
    closePostWorkspace();
  }

  function openCreateDocument() {
    setMaterialsCreateKey((prev) => prev + 1);
    closePostWorkspace();
    closeFaqWorkspace();
    setMainTab("materials");
  }

  function closeFaqWorkspace() {
    setEditingFaqId(null);
    setFaqCreateOpen(false);
  }

  function handleMainTabChange(nextTab: InformationMainTab) {
    setMainTab(nextTab);
    closePostWorkspace();
    closeFaqWorkspace();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
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
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setPostTemplatesPanelOpen(true)}
                    disabled={applyingPostsTemplate || isPending}
                    className={[adminButtonClasses({ variant: "secondary" }), "gap-2 disabled:opacity-60"].join(" ")}
                  >
                    <TemplateIcon className="h-5 w-5" />
                    Шаблони
                  </button>

                  <button
                    type="button"
                    onClick={openCreatePost}
                    disabled={!housePageId}
                    className={[adminButtonClasses({ variant: "primary" }), "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
                  >
                    Нова стаття
                  </button>
                </div>
              ) : null}

              {mainTab === "materials" ? (
                <button
                  type="button"
                  onClick={openCreateDocument}
                  className={adminButtonClasses({ variant: "primary" })}
                >
                  Новий матеріал
                </button>
              ) : null}

              {mainTab === "faq" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setFaqTemplatesPanelOpen(true)}
                    disabled={applyingFaqTemplate || isPending}
                    className={[adminButtonClasses({ variant: "secondary" }), "gap-2 disabled:opacity-60"].join(" ")}
                  >
                    <TemplateIcon className="h-5 w-5" />
                    Шаблони
                  </button>

                  <button
                    type="button"
                    onClick={openCreateFaqForm}
                    disabled={isPending}
                    className={[adminButtonClasses({ variant: "primary" }), "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
                  >
                    Створити FAQ
                  </button>
                </div>
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
                  count: faqs.length,
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

      <AdminSidePanel
        title="Шаблони FAQ"
        description="Оберіть збережений FAQ-шаблон. Після підтвердження він створить FAQ-чернетку в поточному будинку."
        isOpen={faqTemplatesPanelOpen}
        onClose={() => setFaqTemplatesPanelOpen(false)}
      >
        <ContentTemplateSlotsPanel
          houseId={houseId}
          sectionKind="faq"
          slotLimit={3}
          templates={faqTemplates}
          title="Збережені FAQ-шаблони"
          description="Шаблони доступні в усіх будинках. Застосування створює нову FAQ-чернетку."
          disabled={applyingFaqTemplate || isPending}
          onApplyTemplateKeys={applyFaqTemplateKeys}
        />
      </AdminSidePanel>

      {mainTab === "posts" ? (
        <>
          <AdminSidePanel
            title="Шаблони інформаційних матеріалів"
            description="Оберіть збережений шаблон. Після підтвердження він створить чернетку в поточному будинку."
            isOpen={postTemplatesPanelOpen}
            onClose={() => setPostTemplatesPanelOpen(false)}
          >
            <ContentTemplateSlotsPanel
              houseId={houseId}
              sectionKind="information_post"
              slotLimit={3}
              templates={informationPostTemplates}
              title="Збережені інформаційні шаблони"
              description="Шаблони доступні в усіх будинках. Новий шаблон створюється з чернетки інформаційного матеріалу."
              disabled={!housePageId || applyingPostsTemplate || isPending}
              onApplyTemplateKeys={applyInformationTemplateKeys}
            />
          </AdminSidePanel>

          {workspaceMode === "create" ? (
            <CreateInformationPostInlineForm
              houseId={houseId}
              houseSlug={houseSlug}
              housePageId={housePageId}
              templates={informationPostTemplates}
              templateSlotLimit={3}
              onClose={closePostWorkspace}
            />
          ) : null}

          {workspaceError ? (
            <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
              {workspaceError}
            </div>
          ) : null}

          {workspaceMode === "edit" && editingPost ? (
            <div className="space-y-4">
              <EditInformationPostForm
                headerActions={
                  editingPost.status !== "draft" ? (
                    <ContentWorkspaceActionButtons
                      houseId={houseId}
                      sourceId={editingPost.id}
                      commandType="information_posts.duplicate"
                      duplicateTargets={duplicateTargets}
                      disabled={isPending}
                      isCopying={copyingPostId === editingPost.id}
                      onCopy={() => handleCopyPostToDraft(editingPost.id)}
                      duplicatePanelTitle="Копії інформаційного матеріалу"
                    />
                  ) : null
                }
                houseId={houseId}
                houseSlug={houseSlug}
                section={editingPost}
                onClose={closePostWorkspace}
              />
            </div>
          ) : null}

          <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
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
                      className={`block w-full overflow-hidden rounded-[var(--r-lg)] border p-4 text-left transition ${
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
                              {formatAdminDate(getPostDate(content), "Дату не вказано")}
                            </span>
                            <AdminStatusBadge tone={statusToneFor(section.status)}>
                              {statusLabelFor(section.status)}
                            </AdminStatusBadge>
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
                <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
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
          {workspaceError ? (
            <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
              {workspaceError}
            </div>
          ) : null}

          {!editingFaq && !faqCreateOpen ? (
            <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
              <div className="space-y-4">
                {visibleFaqs.length > 0 ? (
                  visibleFaqs.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => openFaqWorkspace(faq.id)}
                      className="block w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 text-left transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface-elevated)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminStatusBadge tone={statusToneFor(faq.status)}>
                          {statusLabelFor(faq.status)}
                        </AdminStatusBadge>
                        <span className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
                          Запитань: {faq.items.length}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
                          Оновлено: {formatAdminDate(faq.updatedAt, "Дату не вказано")}
                        </span>
                      </div>

                      <div className="mt-3 text-base font-semibold text-[var(--cms-text)]">
                        FAQ для мешканців
                      </div>

                      <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
                        {faq.status === "draft"
                          ? "Чернетку можна редагувати, зберегти як шаблон або підтвердити для заміни активного FAQ."
                          : faq.status === "published"
                            ? "Цей FAQ зараз показується на публічній сторінці будинку."
                            : "Архівна версія FAQ не показується на сайті."}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
                    FAQ поки не створено. Створи першу FAQ-чернетку через кнопку зверху.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {faqCreateOpen ? (
            <CreateInformationFaqForm
              houseId={houseId}
              templates={faqTemplates}
              templateSlotLimit={3}
              onClose={closeFaqWorkspace}
            />
          ) : null}

          {editingFaq ? (
            <EditInformationFaqForm
              houseId={houseId}
              faq={editingFaq}
              duplicateTargets={duplicateTargets}
              templates={faqTemplates}
              templateSlotLimit={3}
              onClose={closeFaqWorkspace}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
