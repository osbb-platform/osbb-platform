"use client";

import { useState } from "react";
import type { HouseDocumentListItem } from "@/src/modules/houses/services/getHouseDocuments";
import { CreateInformationPostInlineForm } from "@/src/modules/houses/components/CreateInformationPostInlineForm";
import { EditInformationFaqForm } from "@/src/modules/houses/components/EditInformationFaqForm";
import { EditInformationPostForm } from "@/src/modules/houses/components/EditInformationPostForm";
import { HouseDocumentsWorkspace } from "@/src/modules/houses/components/HouseDocumentsWorkspace";
import { adminPrimaryButtonClass } from "@/src/shared/ui/admin/adminStyles";

export const INFORMATION_CATEGORIES = [
  "О доме",
  "Правила проживания",
  "Полезная информация",
  "Контакты служб",
  "Инструкции для жильцов",
] as const;

type InformationMainTab = "posts" | "faq" | "materials";
type PostWorkspaceMode = "idle" | "create" | "edit";

type InformationSectionItem = {
  id: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};

type Props = {
  houseId: string;
  houseSlug: string;
  housePageId: string | null;
  posts: InformationSectionItem[];
  faqSections: InformationSectionItem[];
  documents: HouseDocumentListItem[];
};

function getPostDate(content: Record<string, unknown>) {
  const publishedAt =
    typeof content.publishedAt === "string" ? content.publishedAt : null;
  const createdAt =
    typeof content.createdAt === "string" ? content.createdAt : null;

  return publishedAt ?? createdAt ?? "";
}

function formatDate(value: string) {
  if (!value) return "Дата не указана";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";

  return date.toLocaleDateString("ru-RU", {
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
  faqSections,
  documents,
}: Props) {
  const [mainTab, setMainTab] = useState<InformationMainTab>("posts");
  const [workspaceMode, setWorkspaceMode] = useState<PostWorkspaceMode>("idle");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqEditorSectionId, setFaqEditorSectionId] = useState<string | null>(null);
  const [materialsCreateKey, setMaterialsCreateKey] = useState(0);

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
    setWorkspaceMode("create");
    setEditingSectionId(null);
    setFaqOpen(false);
  }

  function openEditPost(sectionId: string) {
    setWorkspaceMode("edit");
    setEditingSectionId(sectionId);
    setFaqOpen(false);
  }

  function closePostWorkspace() {
    setWorkspaceMode("idle");
    setEditingSectionId(null);
  }


  const editingFaqSection =
    faqEditorSectionId
      ? faqSections.find((section) => section.id === faqEditorSectionId) ?? null
      : null;

  function openCreateFaqWorkspace() {
    setFaqEditorSectionId(null);
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
    setFaqEditorSectionId(null);
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
                Информация дома
              </h2>
              <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
                Управление статьями, FAQ и PDF-материалами для жителей.
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
              Новая статья
            </button>
          ) : null}

              {mainTab === "materials" ? (
            <button
              type="button"
              onClick={openCreateDocument}
              className={adminPrimaryButtonClass}
            >
              Новый материал
            </button>
          ) : null}

              {mainTab === "faq" ? (
            <button
              type="button"
              onClick={openCreateFaqWorkspace}
              disabled={!housePageId}
              className={[adminPrimaryButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
            >
              Новый FAQ
            </button>
          ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleMainTabChange("posts")}
              className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                mainTab === "posts"
                  ? "bg-[var(--cms-primary)] text-white"
                  : "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)]"
              }`}
            >
              <span>Информация</span>
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                mainTab === "posts"
                  ? "bg-white text-[var(--cms-text)]"
                  : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]"
              }`}>
                {posts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMainTabChange("faq")}
              className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                mainTab === "faq"
                  ? "bg-[var(--cms-primary)] text-white"
                  : "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)]"
              }`}
            >
              <span>FAQ</span>
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                mainTab === "faq"
                  ? "bg-white text-[var(--cms-text)]"
                  : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]"
              }`}>
                {faqSections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMainTabChange("materials")}
              className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                mainTab === "materials"
                  ? "bg-[var(--cms-primary)] text-white"
                  : "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)]"
              }`}
            >
              <span>Материалы</span>
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                mainTab === "materials"
                  ? "bg-white text-[var(--cms-text)]"
                  : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]"
              }`}>
                {documents.length}
              </span>
            </button>
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

          {workspaceMode === "edit" && editingPost ? (
            <EditInformationPostForm
              houseId={houseId}
              houseSlug={houseSlug}
              section={editingPost}
              onClose={closePostWorkspace}
            />
          ) : null}

          <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
            <div className="space-y-4">
              {visiblePosts.length > 0 ? (
                visiblePosts.map((section) => {
                  const content = section.content;
                  const category =
                    typeof content.category === "string"
                      ? content.category
                      : "Без фильтра";
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
                          ? "border-emerald-800 bg-emerald-950/10"
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
                                  ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                                  : "border border-amber-500/20 bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {section.status === "published" ? "Активно" : "Черновик"}
                            </span>
                            {Boolean(content.isPinned) ? (
                              <span className="inline-flex rounded-full border border-emerald-800 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                                PIN
                              </span>
                            ) : null}
                          </div>

                          <div className="text-base font-semibold text-[var(--cms-text)]">
                            {section.title || "Без заголовка"}
                          </div>

                          <div className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                            {preview || "Текст сообщения пока не заполнен"}
                          </div>
                        </div>

                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
                  Сообщений пока нет. Создай первую публикацию через кнопку сверху.
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
        />
      ) : null}

      {mainTab === "faq" ? (
        <>
          {!faqOpen ? (
            <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
              <div className="space-y-4">
                {faqSections.length > 0 ? (
                  faqSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setFaqEditorSectionId(section.id);
                        setFaqOpen(true);
                      }}
                      className="block w-full rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-5 text-left transition hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface-elevated)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            section.status === "published"
                              ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                              : "border border-amber-500/20 bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {section.status === "published" ? "Активно" : "Черновик"}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
                          Вопросов: {Array.isArray(section.content.items) ? section.content.items.length : 0}
                        </span>
                      </div>

                      <div className="mt-3 text-base font-semibold text-[var(--cms-text)]">
                        FAQ для жителей
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--cms-border)] px-4 py-4 text-[var(--cms-text-muted)]">
                    FAQ пока не создан. Используй кнопку сверху, чтобы добавить первый блок.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {faqOpen ? (
            <EditInformationFaqForm
              houseId={houseId}
              houseSlug={houseSlug}
              housePageId={housePageId}
              section={editingFaqSection}
              onClose={closeFaqWorkspace}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
