"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type UpdateHouseSectionState = {
  error: string | null;
  planItems?: unknown[] | null;
};

type BoardRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";
type SpecialistStatus = "active" | "draft" | "archived";

type BoardRolePayload = {
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

type SpecialistLogItem = {
  id: string;
  title: string;
  status: SpecialistStatus;
};

const INFORMATION_CATEGORIES = [
  "О доме",
  "Правила проживания",
  "Полезная информация",
  "Контакты служб",
  "Инструкции для жильцов",
];

const SPECIALIST_CATEGORIES = [
  "Сантехник",
  "Электрик",
  "Аварийная служба",
  "Уборка / обслуживание",
  "Управляющая компания",
] as const;

const REPORTS_BUCKET = "house-reports";
const INFORMATION_IMAGES_BUCKET = "house-information-images";
const PLAN_IMAGES_BUCKET = "house-plan-media";
const PLAN_DOCUMENTS_BUCKET = "house-plan-documents";

function sanitizeFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return normalized || "report-file.pdf";
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function normalizeCategory(value: string) {
  return INFORMATION_CATEGORIES.includes(value)
    ? value
    : INFORMATION_CATEGORIES[0];
}

function buildFaqItems(formData: FormData) {
  const rawPayload = String(formData.get("faqPayload") ?? "").trim();

  if (!rawPayload) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawPayload) as Array<Record<string, unknown>>;
    return parsed
      .map((item) => ({
        question: String(item.question ?? "").trim(),
        answer: String(item.answer ?? "").trim(),
      }))
      .filter((item) => item.question || item.answer);
  } catch {
    return [];
  }
}

function parseBoardPayload(formData: FormData) {
  const rawPayload = String(formData.get("boardPayload") ?? "").trim();
  if (!rawPayload) return null;

  try {
    const parsed = JSON.parse(rawPayload) as {
      intro?: unknown;
      roles?: unknown;
    };

    const intro =
      typeof parsed.intro === "string" ? parsed.intro.trim() : "";

    const roles = Array.isArray(parsed.roles)
      ? parsed.roles
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;

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
                typeof raw.id === "string" && raw.id.trim()
                  ? raw.id.trim()
                  : `role-${index + 1}`,
              status,
              name: String(raw.name ?? "").trim(),
              role: String(raw.role ?? "").trim(),
              phone: String(raw.phone ?? "").trim(),
              email: String(raw.email ?? "").trim(),
              officeHours: String(raw.officeHours ?? "").trim(),
              description: String(raw.description ?? "").trim(),
              sortOrder:
                typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
                  ? raw.sortOrder
                  : index,
            } satisfies BoardRolePayload;
          })
          .filter((item): item is BoardRolePayload => Boolean(item))
      : [];

    const chairmanCount = roles.filter(
      (item) => item.status === "chairman",
    ).length;
    const viceChairmanCount = roles.filter(
      (item) => item.status === "vice_chairman",
    ).length;

    if (chairmanCount > 1) {
      return {
        error:
          "В разделе правления может быть только один председатель. Сначала удалите текущую карточку председателя.",
      };
    }

    if (viceChairmanCount > 1) {
      return {
        error:
          "В разделе правления может быть только один заместитель председателя. Сначала удалите текущую карточку заместителя председателя.",
      };
    }

    return {
      intro,
      roles: roles.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    };
  } catch {
    return null;
  }
}

function parseSpecialistsPayload(formData: FormData) {
  const rawPayload = String(formData.get("specialistsPayload") ?? "").trim();
  if (!rawPayload) return null;

  try {
    return JSON.parse(rawPayload) as {
      specialists?: unknown;
      categoriesCatalog?: unknown;
      updatedAt?: unknown;
    };
  } catch {
    return null;
  }
}

function normalizeSpecialistsForDiff(value: unknown): SpecialistLogItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const status =
        raw.status === "active" ||
        raw.status === "draft" ||
        raw.status === "archived"
          ? raw.status
          : "draft";

      const id = String(raw.id ?? "").trim();
      const title = String(raw.title ?? "").trim();

      if (!id) return null;

      return {
        id,
        title: title || "Без названия",
        status,
      };
    })
    .filter((item): item is SpecialistLogItem => Boolean(item));
}

function buildSpecialistsDiffLog(params: {
  previous: SpecialistLogItem[];
  next: SpecialistLogItem[];
}) {
  const prevMap = new Map(params.previous.map((item) => [item.id, item]));
  const nextMap = new Map(params.next.map((item) => [item.id, item]));

  for (const nextItem of params.next) {
    const prevItem = prevMap.get(nextItem.id);

    if (!prevItem) {
      return `Создан специалист «${nextItem.title}».`;
    }

    if (prevItem.status !== nextItem.status) {
      if (prevItem.status === "draft" && nextItem.status === "active") {
        return `Подтвержден специалист «${nextItem.title}».`;
      }

      if (nextItem.status === "archived") {
        return `Специалист «${nextItem.title}» перемещен в архив.`;
      }

      if (prevItem.status === "archived" && nextItem.status === "active") {
        return `Специалист «${nextItem.title}» восстановлен из архива.`;
      }
    }

    if (prevItem.title !== nextItem.title) {
      return `Обновлена карточка специалиста «${nextItem.title}».`;
    }
  }

  for (const prevItem of params.previous) {
    if (!nextMap.has(prevItem.id)) {
      return `Специалист «${prevItem.title}» удален из архива.`;
    }
  }

  return "Обновлен список специалистов.";
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function updateHouseSection(
  _prevState: UpdateHouseSectionState,
  formData: FormData,
): Promise<UpdateHouseSectionState> {
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();

  const currentUser = await getCurrentAdminUser();
  const access = getResolvedAccess(currentUser?.role);

  const readonlyKinds = new Set(["contacts", "reports", "requisites"]);
  const workflowOnlyKinds = new Set(["plan", "meetings"]);

  if (readonlyKinds.has(kind)) {
    const workspaceKey =
      kind === "contacts"
        ? "board"
        : kind === "reports"
          ? "reports"
          : "requisites";

    const workspace =
      access.houseWorkspaces[
        workspaceKey as "board" | "reports" | "requisites"
      ];

    if (!workspace.edit) {
      return { error: "У вас нет прав для редактирования этого раздела." };
    }
  }

  if (
    workflowOnlyKinds.has(kind) &&
    status &&
    !access.houseWorkspaces[
      kind as "plan" | "meetings"
    ].changeWorkflowStatus
  ) {
    return { error: "У вас нет прав для смены статуса в этом разделе." };
  }

  const publishWorkspaceKey =
    kind === "rich_text" || kind === "faq"
      ? "information"
      : kind === "contacts"
        ? "board"
        : kind === "specialists"
          ? "specialists"
          : kind === "reports"
            ? "reports"
            : kind === "debtors"
              ? "debtors"
              : null;

  if (
    status === "published" &&
    publishWorkspaceKey &&
    !access.houseWorkspaces[publishWorkspaceKey].publish
  ) {
    return { error: "Публикация доступна только администратору." };
  }

  if (!sectionId || !houseId || !houseSlug || !kind) {
    return { error: "Не переданы обязательные параметры секции." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingSection } = await supabase
    .from("house_sections")
    .select("content")
    .eq("id", sectionId)
    .maybeSingle();

  const existingContent =
    existingSection?.content &&
    typeof existingSection.content === "object"
      ? (existingSection.content as Record<string, unknown>)
      : {};

  let content: Record<string, unknown> = {};
  let historyDescription = "Обновлена секция.";
  let historySubSection = "information";
  let nextPlanItems: unknown[] | null = null;

  if (kind === "rich_text") {
    const headline = String(formData.get("headline") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    let coverImageUrl =
      typeof existingContent.coverImageUrl === "string"
        ? existingContent.coverImageUrl
        : "";

    const coverImage = formData.get("coverImage");

    if (coverImage instanceof File && coverImage.size > 0) {
      const fileExt = coverImage.name.split(".").pop() || "jpg";
      const filePath = `${houseId}/information/${sectionId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(INFORMATION_IMAGES_BUCKET)
        .upload(filePath, coverImage, {
          upsert: true,
          contentType: coverImage.type || undefined,
        });

      if (uploadError) {
        return { error: `Ошибка загрузки изображения: ${uploadError.message}` };
      }

      const { data: publicUrlData } = supabase.storage
        .from(INFORMATION_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      coverImageUrl = publicUrlData.publicUrl ?? coverImageUrl;
    }

    const isPinned = String(formData.get("isPinned") ?? "").trim() === "true";

    content = {
      headline,
      body,
      category: normalizeCategory(
        String(formData.get("category") ?? "").trim(),
      ),
      coverImageUrl: coverImageUrl || null,
      isPinned,
      createdAt:
        typeof existingContent.createdAt === "string"
          ? existingContent.createdAt
          : new Date().toISOString(),
      publishedAt:
        typeof existingContent.publishedAt === "string" ||
        existingContent.publishedAt === null
          ? existingContent.publishedAt
          : null,
      updatedAt: new Date().toISOString(),
    };

    historyDescription = `Обновлен информационный блок «${headline || title}».`;
    historySubSection = "information";
  }

  if (kind === "faq") {    content = {
      items: buildFaqItems(formData),
      updatedAt: new Date().toISOString(),
    };

    historyDescription = "Обновлен FAQ блок.";
    historySubSection = "faq";
  }

  if (kind === "contacts") {
    const parsedBoard = parseBoardPayload(formData);

    if (!parsedBoard) {
      return { error: "Не удалось обработать payload правления." };
    }

    if ("error" in parsedBoard) {
      return { error: parsedBoard.error ?? null };
    }
    content = {
      intro: parsedBoard.intro ?? null,
      roles: parsedBoard.roles,
      updatedAt: new Date().toISOString(),
    };

    historyDescription = "Обновлен блок правления.";
    historySubSection = "board";
  }

  if (kind === "specialists") {
    const parsedSpecialists = parseSpecialistsPayload(formData);

    if (!parsedSpecialists) {
      return { error: "Не удалось обработать payload специалистов." };
    }

    const previousSpecialists = normalizeSpecialistsForDiff(
      existingContent.specialists,
    );

    const nextSpecialists = normalizeSpecialistsForDiff(
      parsedSpecialists.specialists,
    );

    historyDescription = buildSpecialistsDiffLog({
      previous: previousSpecialists,
      next: nextSpecialists,
    });
    content = {
      categoriesCatalog: Array.isArray(parsedSpecialists.categoriesCatalog)
        ? parsedSpecialists.categoriesCatalog
        : [...SPECIALIST_CATEGORIES],
      specialists: Array.isArray(parsedSpecialists.specialists)
        ? parsedSpecialists.specialists
        : [],
      updatedAt: new Date().toISOString(),
    };

    historySubSection = "specialists";
  }

  if (kind === "meetings") {
    const rawPayload = String(formData.get("content") ?? "").trim();

    if (!rawPayload) {
      return { error: "Не передан payload собраний." };
    }

    try {
      const parsed = JSON.parse(rawPayload) as {
        items?: unknown;
        updatedAt?: unknown;
      };

      content = {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        updatedAt: new Date().toISOString(),
      };

      historyDescription = "Обновлен раздел собраний.";
      historySubSection = "meetings";
    } catch {
      return { error: "Не удалось обработать payload собраний." };
    }
  }

  if (kind === "reports") {
    const rawPayload = String(formData.get("reportsPayload") ?? "").trim();
    const activeReportId = String(formData.get("activeReportId") ?? "").trim();
    const reportAction = String(formData.get("reportAction") ?? "save").trim();
    const removeReportPdf =
      String(formData.get("removeReportPdf") ?? "") === "true";
    const fileEntry = formData.get("reportPdf");
    const nextFile =
      isFileLike(fileEntry) && fileEntry.size > 0 ? fileEntry : null;

    if (!rawPayload) {
      return { error: "Не передан payload отчетов." };
    }

    if (nextFile) {
      const lowerName = nextFile.name.toLowerCase();
      const isPdf =
        nextFile.type === "application/pdf" || lowerName.endsWith(".pdf");

      if (!isPdf) {
        return { error: "Для отчета можно загружать только PDF файл." };
      }
    }

    let parsedPayload: Record<string, unknown>;

    try {
      parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      return { error: "Не удалось обработать reports payload." };
    }

    const nowIso = new Date().toISOString();
    const reports: Array<Record<string, unknown>> = [];

    if (Array.isArray(parsedPayload.reports)) {
      for (const item of parsedPayload.reports) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const raw = item as Record<string, unknown>;

        reports.push({
          id: String(raw.id ?? "").trim(),
          title: String(raw.title ?? "").trim(),
          description: String(raw.description ?? "").trim(),
          category: String(raw.category ?? "").trim(),
          reportDate: String(raw.reportDate ?? "").trim(),
          periodType: raw.periodType === "past" ? "past" : "current",
          month: typeof raw.month === "string" ? raw.month : undefined,
          year: typeof raw.year === "number" ? raw.year : undefined,
          isPinned: Boolean(raw.isPinned),
          isNew: Boolean(raw.isNew),
          newUntil:
            typeof raw.newUntil === "string" && raw.newUntil
              ? raw.newUntil
              : null,
          status:
            raw.status === "active" || raw.status === "archived"
              ? raw.status
              : "draft",
          pdfFileName:
            typeof raw.pdfFileName === "string" ? raw.pdfFileName : "",
          pdfPath: typeof raw.pdfPath === "string" ? raw.pdfPath : "",
          createdAt:
            typeof raw.createdAt === "string" && raw.createdAt
              ? raw.createdAt
              : nowIso,
          updatedAt: nowIso,
          archivedAt:
            typeof raw.archivedAt === "string" && raw.archivedAt
              ? raw.archivedAt
              : null,
        });
      }
    }

    if ((nextFile || removeReportPdf || reportAction === "publish" || reportAction === "archive" || reportAction === "delete") && !activeReportId) {
      return { error: "Не удалось определить отчет для операции." };
    }

    const targetReport =
      activeReportId
        ? reports.find((item) => String(item.id ?? "") === activeReportId)
        : null;

    if ((nextFile || removeReportPdf || reportAction === "publish" || reportAction === "archive" || reportAction === "delete") && !targetReport) {
      return { error: "Не найден отчет для выполнения операции." };
    }

    if (targetReport) {
      const previousPdfPath =
        typeof targetReport.pdfPath === "string" ? targetReport.pdfPath : "";

      if ((removeReportPdf || nextFile || reportAction === "delete") && previousPdfPath) {
        const { error: removeError } = await supabase.storage
          .from(REPORTS_BUCKET)
          .remove([previousPdfPath]);

        if (removeError) {
          return {
            error: `Не удалось удалить предыдущий PDF отчета: ${removeError.message}`,
          };
        }
      }

      if (nextFile) {
        const safeFileName = sanitizeFileName(nextFile.name);
        const nextStoragePath = `${houseId}/${activeReportId}/${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from(REPORTS_BUCKET)
          .upload(nextStoragePath, nextFile, {
            upsert: true,
            contentType: nextFile.type || undefined,
          });

        if (uploadError) {
          return {
            error: `Не удалось загрузить PDF отчета: ${uploadError.message}`,
          };
        }

        targetReport.pdfFileName = nextFile.name;
        targetReport.pdfPath = nextStoragePath;
        targetReport.updatedAt = nowIso;
      } else if (removeReportPdf || reportAction == "delete") {
        targetReport.pdfFileName = "";
        targetReport.pdfPath = "";
        targetReport.updatedAt = nowIso;
      }

      if (reportAction === "publish") {
        targetReport.status = "active";
        targetReport.archivedAt = null;
        targetReport.updatedAt = nowIso;
      }

      if (reportAction === "archive") {
        targetReport.status = "archived";
        targetReport.archivedAt = nowIso;
        targetReport.isPinned = false;
        targetReport.isNew = false;
        targetReport.newUntil = null;
        targetReport.updatedAt = nowIso;
      }
    }

    const nextReports =
      reportAction === "delete"
        ? reports.filter((item) => String(item.id ?? "") !== activeReportId)
        : reportAction === "delete_archive"
          ? reports.filter((item) => item.status !== "archived")
          : reports;

    content = {
      categoriesCatalog: Array.isArray(parsedPayload.categoriesCatalog)
        ? parsedPayload.categoriesCatalog
        : [],
      reports: nextReports,
      updatedAt: nowIso,
    };

    historyDescription =
      reportAction === "delete"
        ? "Удален отчет."
        : reportAction === "delete_archive"
          ? "Архив отчетов очищен."
          : reportAction === "publish"
            ? "Отчет опубликован."
            : reportAction === "archive"
              ? "Отчет перемещен в архив."
              : "Обновлен раздел отчетов.";
    historySubSection = "reports";
  }

  if (kind === "plan") {
    const rawPayload = String(formData.get("planPayload") ?? "").trim();
    const activePlanTaskId = String(
      formData.get("activePlanTaskId") ?? "",
    ).trim();

    if (!rawPayload) {
      return { error: "Не передан payload плана работ." };
    }

    const imageFiles = formData
      .getAll("planImageFiles")
      .filter((entry): entry is File => isFileLike(entry) && entry.size > 0);

    const pdfFiles = formData
      .getAll("planPdfFiles")
      .filter((entry): entry is File => isFileLike(entry) && entry.size > 0);

    const rawRemovePlanImageIds = String(
      formData.get("removePlanImageIds") ?? "[]",
    ).trim();
    const rawRemovePlanDocumentIds = String(
      formData.get("removePlanDocumentIds") ?? "[]",
    ).trim();

    let removePlanImageIds: string[] = [];
    let removePlanDocumentIds: string[] = [];

    try {
      const parsedImageIds = JSON.parse(rawRemovePlanImageIds);
      if (Array.isArray(parsedImageIds)) {
        removePlanImageIds = parsedImageIds
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
      }
    } catch {}

    try {
      const parsedDocumentIds = JSON.parse(rawRemovePlanDocumentIds);
      if (Array.isArray(parsedDocumentIds)) {
        removePlanDocumentIds = parsedDocumentIds
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
      }
    } catch {}

    let parsedPayload: Record<string, unknown>;

    try {
      parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      return { error: "Не удалось обработать plan payload." };
    }

    const nowIso = new Date().toISOString();

    const items = Array.isArray(parsedPayload.items)
      ? parsedPayload.items.map((item) =>
          item && typeof item === "object"
            ? { ...(item as Record<string, unknown>) }
            : item,
        )
      : [];

    const hasInvalidPublishTask = items.some((item) => {
      if (!item || typeof item !== "object") return false;

      const raw = item as Record<string, unknown>;
      const status = String(raw.status ?? "draft");
      const dateMode = raw.dateMode === "range" ? "range" : "deadline";

      if (
        status !== "planned" &&
        status !== "in_progress" &&
        status !== "completed" &&
        status !== "archived"
      ) {
        return false;
      }

      if (dateMode === "deadline") {
        return !String(raw.deadlineAt ?? "").trim();
      }

      return (
        !String(raw.startDate ?? "").trim() ||
        !String(raw.endDate ?? "").trim()
      );
    });

    if (hasInvalidPublishTask) {
      return {
        error:
          "Для активных, выполненных и архивных задач обязательно заполнить даты.",
      };
    }

    if ((imageFiles.length > 0 || pdfFiles.length > 0) && !activePlanTaskId) {
      return {
        error: "Не удалось определить задачу для загрузки вложений.",
      };
    }

    const targetTask =
      activePlanTaskId
        ? items.find((item) => {
            if (!item || typeof item !== "object") return false;
            return String((item as Record<string, unknown>).id ?? "") === activePlanTaskId;
          })
        : null;

    if ((imageFiles.length > 0 || pdfFiles.length > 0) && !targetTask) {
      return {
        error: "Не найдена задача для загрузки вложений.",
      };
    }

    if (targetTask && typeof targetTask === "object") {
      const task = targetTask as Record<string, unknown>;

      const existingImages = Array.isArray(task.images)
        ? [...task.images]
        : [];
      const existingDocuments = Array.isArray(task.documents)
        ? [...task.documents]
        : [];

      const imagesToDelete = existingImages.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const raw = item as Record<string, unknown>;
        return removePlanImageIds.includes(String(raw.id ?? ""));
      });

      const documentsToDelete = existingDocuments.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const raw = item as Record<string, unknown>;
        return removePlanDocumentIds.includes(String(raw.id ?? ""));
      });

      for (const item of imagesToDelete) {
        const raw = item as Record<string, unknown>;
        const existingPath = String(raw.path ?? "").trim();

        if (existingPath) {
          const { error: removeError } = await supabase.storage
            .from(PLAN_IMAGES_BUCKET)
            .remove([existingPath]);

          if (removeError) {
            return {
              error: `Не удалось удалить старое фото задачи: ${removeError.message}`,
            };
          }
        }
      }

      for (const item of documentsToDelete) {
        const raw = item as Record<string, unknown>;
        const existingPath = String(raw.path ?? "").trim();

        if (existingPath) {
          const { error: removeError } = await supabase.storage
            .from(PLAN_DOCUMENTS_BUCKET)
            .remove([existingPath]);

          if (removeError) {
            return {
              error: `Не удалось удалить старый PDF задачи: ${removeError.message}`,
            };
          }
        }
      }

      const keptImages = existingImages.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const raw = item as Record<string, unknown>;
        return !removePlanImageIds.includes(String(raw.id ?? ""));
      });

      const keptDocuments = existingDocuments.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const raw = item as Record<string, unknown>;
        return !removePlanDocumentIds.includes(String(raw.id ?? ""));
      });

      if (keptImages.length + imageFiles.length > 5) {
        return {
          error: "К задаче можно прикрепить не более 5 фото.",
        };
      }

      if (keptDocuments.length + pdfFiles.length > 2) {
        return {
          error: "К задаче можно прикрепить не более 2 PDF документов.",
        };
      }

      for (let index = 0; index < imageFiles.length; index += 1) {
        const nextFile = imageFiles[index];
        const isImage =
          nextFile.type.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif|svg)$/i.test(nextFile.name);

        if (!isImage) {
          return {
            error: `Файл «${nextFile.name}» не является изображением.`,
          };
        }

        const safeFileName = sanitizeFileName(nextFile.name);
        const nextStoragePath = `${houseId}/${activePlanTaskId}/images/${Date.now()}-${index}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from(PLAN_IMAGES_BUCKET)
          .upload(nextStoragePath, nextFile, {
            upsert: true,
            contentType: nextFile.type || undefined,
          });

        if (uploadError) {
          return {
            error: `Не удалось загрузить фото задачи: ${uploadError.message}`,
          };
        }

        keptImages.push({
          id: `plan-image-${Date.now()}-${index}`,
          path: nextStoragePath,
          fileName: nextFile.name,
          kind: "image",
          createdAt: nowIso,
        });
      }

      for (let index = 0; index < pdfFiles.length; index += 1) {
        const nextFile = pdfFiles[index];
        const lowerName = nextFile.name.toLowerCase();
        const isPdf =
          nextFile.type === "application/pdf" || lowerName.endsWith(".pdf");

        if (!isPdf) {
          return {
            error: `Файл «${nextFile.name}» не является PDF документом.`,
          };
        }

        const safeFileName = sanitizeFileName(nextFile.name);
        const nextStoragePath = `${houseId}/${activePlanTaskId}/documents/${Date.now()}-${index}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from(PLAN_DOCUMENTS_BUCKET)
          .upload(nextStoragePath, nextFile, {
            upsert: true,
            contentType: nextFile.type || undefined,
          });

        if (uploadError) {
          return {
            error: `Не удалось загрузить PDF задачи: ${uploadError.message}`,
          };
        }

        keptDocuments.push({
          id: `plan-pdf-${Date.now()}-${index}`,
          path: nextStoragePath,
          fileName: nextFile.name,
          kind: "pdf",
          createdAt: nowIso,
        });
      }

      task.images = keptImages;
      task.documents = keptDocuments;
      task.updatedAt = nowIso;
    }

    content = {
      items,
      updatedAt: nowIso,
    };

    nextPlanItems = items;
    historyDescription = "Обновлен раздел плана работ.";
    historySubSection = "plan";
  }


  if (kind === "requisites") {
    const rawPayload = String(formData.get("content") ?? "").trim();

    if (!rawPayload) {
      return { error: "Не передан payload реквизитов." };
    }

    let parsedPayload: Record<string, unknown>;

    try {
      parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      return { error: "Не удалось обработать payload реквизитов." };
    }

    content = {
      recipient: String(parsedPayload.recipient ?? "").trim(),
      iban: String(parsedPayload.iban ?? "").trim(),
      edrpou: String(parsedPayload.edrpou ?? "").trim(),
      bank: String(parsedPayload.bank ?? "").trim(),
      purposeTemplate: String(
        parsedPayload.purposeTemplate ?? "",
      ).trim(),
      paymentUrl: String(parsedPayload.paymentUrl ?? "").trim(),
      paymentButtonLabel: String(
        parsedPayload.paymentButtonLabel ?? "Перейти к оплате",
      ).trim(),
      updatedAt: new Date().toISOString(),
    };

    historyDescription = "Обновлены реквизиты для оплаты.";
    historySubSection = "requisites";
  }

  if (kind === "debtors") {
    const mode = String(formData.get("debtorsMode") ?? "save_draft").trim();
    const rawPayload = String(formData.get("debtorsPayload") ?? "").trim();

    let parsedPayload: Record<string, unknown> = {};

    if (rawPayload) {
      try {
        parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;
      } catch {
        return { error: "Не удалось обработать payload должников." };
      }
    }

    const nowIso = new Date().toISOString();

    const normalizeDebtItems = (value: unknown) =>
      Array.isArray(value)
        ? value
            .filter((item) => item && typeof item === "object")
            .map((item) => {
              const raw = item as Record<string, unknown>;

              return {
                apartmentId: String(raw.apartmentId ?? "").trim(),
                apartmentLabel: String(raw.apartmentLabel ?? "").trim(),
                accountNumber: String(raw.accountNumber ?? "").trim(),
                ownerName: String(raw.ownerName ?? "").trim(),
                area:
                  typeof raw.area === "number" && Number.isFinite(raw.area)
                    ? raw.area
                    : null,
                amount: String(raw.amount ?? "").trim(),
                days: String(raw.days ?? "").trim(),
              };
            })
            .filter((item) => item.apartmentId && item.amount)
        : [];

    const parsedPayment =
      parsedPayload.payment && typeof parsedPayload.payment === "object"
        ? (parsedPayload.payment as Record<string, unknown>)
        : existingContent.payment && typeof existingContent.payment === "object"
          ? (existingContent.payment as Record<string, unknown>)
          : {};

    const nextPayment = {
      url: String(parsedPayment.url ?? "").trim(),
      title:
        String(parsedPayment.title ?? "Оплата задолженности").trim() ||
        "Оплата задолженности",
      note: String(parsedPayment.note ?? "").trim(),
      buttonLabel:
        String(parsedPayment.buttonLabel ?? "Оплатить").trim() || "Оплатить",
    };

    const existingActiveItems = Array.isArray(existingContent.activeItems)
      ? existingContent.activeItems
      : [];

    const existingDraftItems = Array.isArray(existingContent.draftItems)
      ? existingContent.draftItems
      : [];

    if (mode === "save_payment") {
      content = {
        updatedAt: nowIso,
        payment: nextPayment,
        activeItems: existingActiveItems,
        draftItems: existingDraftItems,
      };

      historyDescription = "Обновлены настройки блока оплаты в разделе должников.";
      historySubSection = "debtors";
    } else if (mode === "delete_draft") {
      content = {
        updatedAt: nowIso,
        payment: nextPayment,
        activeItems: existingActiveItems,
        draftItems: [],
      };

      historyDescription = "Удален черновик раздела должников.";
      historySubSection = "debtors";
    } else if (mode === "publish_draft") {
      const nextActiveItems = normalizeDebtItems(existingDraftItems);

      content = {
        updatedAt: nowIso,
        payment: nextPayment,
        activeItems: nextActiveItems,
        draftItems: [],
      };

      historyDescription = "Опубликован раздел должников.";
      historySubSection = "debtors";
    } else {
      if (!rawPayload) {
        return { error: "Не передан payload должников." };
      }

      const nextDraftItems = normalizeDebtItems(parsedPayload.draftItems);

      content = {
        updatedAt: nowIso,
        payment: nextPayment,
        activeItems: existingActiveItems,
        draftItems: nextDraftItems,
      };

      historyDescription = "Обновлен черновик раздела должников.";
      historySubSection = "debtors";
    }
  }

  const nextSectionStatus =
    kind === "reports"
      ? "published"
      : (status || "draft");

  const { error: updateError } = await supabase
    .from("house_sections")
    .update({
      title: title || null,
      status: nextSectionStatus,
      content,
    })
    .eq("id", sectionId);

  if (updateError) {
    return { error: `Ошибка обновления секции: ${updateError.message}` };
  }

  const currentAdmin = await getCurrentAdminUser();
  const actorName = getActorDisplayName({
    fullName: currentAdmin?.fullName ?? null,
    email: currentAdmin?.email ?? null,
  });

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName,
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "house_section",
    entityId: sectionId,
    entityLabel: title || kind,
    actionType: "update_house_section",
    description: historyDescription,
    houseId,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: historySubSection,
      entityType: "house_section",
      entityId: sectionId,
      entityTitle: title || kind,
      houseId,
      kind,
    },
  });

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/house/${houseSlug}`);

  const publicRouteByKind: Record<string, string | null> = {
    rich_text: "information",
    faq: "information",
    contacts: "board",
    specialists: "specialists",
    reports: "reports",
    plan: "plan",
    requisites: "requisites",
    debtors: "debtors",
  };

  const publicRoute = publicRouteByKind[kind];

  if (publicRoute) {
    revalidatePath(`/house/${houseSlug}/${publicRoute}`);
  }

  return { error: null, planItems: nextPlanItems };
}
