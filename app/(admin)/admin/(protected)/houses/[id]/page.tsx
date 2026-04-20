import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseAnnouncementsWorkspace } from "@/src/modules/houses/components/HouseAnnouncementsWorkspace";
import { EditBoardSectionForm } from "@/src/modules/houses/components/EditBoardSectionForm";
import { HouseBlockSelector } from "@/src/modules/houses/components/HouseBlockSelector";
import { HouseMeetingsWorkspace } from "@/src/modules/houses/components/HouseMeetingsWorkspace";
import { HouseInformationWorkspace } from "@/src/modules/houses/components/HouseInformationWorkspace";
import { HouseReportsWorkspace } from "@/src/modules/houses/components/HouseReportsWorkspace";
import { HousePlanWorkspace } from "@/src/modules/houses/components/HousePlanWorkspace";
import { HouseDebtorsWorkspace } from "@/src/modules/houses/components/HouseDebtorsWorkspace";
import { HouseSpecialistsWorkspace } from "@/src/modules/houses/components/HouseSpecialistsWorkspace";
import { HouseRequisitesWorkspace } from "@/src/modules/houses/components/HouseRequisitesWorkspace";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { getAdminHousePages } from "@/src/modules/houses/services/getAdminHousePages";
import { getAdminHouseSectionById } from "@/src/modules/houses/services/getAdminHouseSectionById";
import { getAdminHouseSections } from "@/src/modules/houses/services/getAdminHouseSections";
import { getHouseSpecialistContactRequests } from "@/src/modules/houses/services/getHouseSpecialistContactRequests";
import { ensureHouseBoardSection } from "@/src/modules/houses/services/ensureHouseBoardSection";
import { ensureHouseHomePage } from "@/src/modules/houses/services/ensureHouseHomePage";
import { ensureHouseInformationPage } from "@/src/modules/houses/services/ensureHouseInformationPage";
import { ensureHouseSpecialistsSection } from "@/src/modules/houses/services/ensureHouseSpecialistsSection";
import { ensureHouseReportsSection } from "@/src/modules/houses/services/ensureHouseReportsSection";
import { ensureHousePlanSection } from "@/src/modules/houses/services/ensureHousePlanSection";
import { ensureHouseDebtorsSection } from "@/src/modules/houses/services/ensureHouseDebtorsSection";
import { ensureHouseMeetingsSection } from "@/src/modules/houses/services/ensureHouseMeetingsSection";
import { ensureHouseRequisitesSection } from "@/src/modules/houses/services/ensureHouseRequisitesSection";
import { getAdminHouseApartments } from "@/src/modules/apartments/services/getAdminHouseApartments";
import { getHouseDocuments } from "@/src/modules/houses/services/getHouseDocuments";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type AdminHouseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    block?: string;
  }>;
};

const allowedBlocks = new Set([
  "announcements",
  "board",
  "information",
  "reports",
  "debtors",
  "plan",
  "meetings",
  "requisites",
  "specialists",
]);

function normalizeBlock(value: string | undefined) {
  if (value && allowedBlocks.has(value)) {
    return value;
  }

  return "announcements";
}


function normalizeSectionForWorkspace<T extends {
  id: string;
  title: string | null;
  status?: "draft" | "in_review" | "published" | "archived";
  content?: Record<string, unknown>;
}>(section: T) {
  return {
    id: section.id,
    title: section.title ?? "Без названия",
    status: section.status ?? "draft",
    content: section.content ?? {},
  };
}

function getSectionContent(section: unknown): Record<string, unknown> {
  if (
    section &&
    typeof section === "object" &&
    "content" in section &&
    section.content &&
    typeof section.content === "object"
  ) {
    return section.content as Record<string, unknown>;
  }

  return {};
}

function normalizeReportItem(item: unknown) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id : "";
  const title = typeof record.title === "string" ? record.title : "";
  const description =
    typeof record.description === "string" ? record.description : "";
  const category = typeof record.category === "string" ? record.category : "";
  const reportDate =
    typeof record.reportDate === "string" ? record.reportDate : "";
  const periodType: "current" | "past" =
    record.periodType === "past" ? "past" : "current";
  const status: "draft" | "active" | "archived" =
    record.status === "archived"
      ? "archived"
      : record.status === "draft"
        ? "draft"
        : "active";

  if (!id) {
    return null;
  }

  return {
    id,
    title,
    description,
    category,
    reportDate,
    periodType,
    month: typeof record.month === "string" ? record.month : undefined,
    year: typeof record.year === "number" ? record.year : undefined,
    isPinned: typeof record.isPinned === "boolean" ? record.isPinned : undefined,
    isNew: typeof record.isNew === "boolean" ? record.isNew : undefined,
    newUntil:
      typeof record.newUntil === "string" || record.newUntil === null
        ? record.newUntil
        : undefined,
    status,
    pdfFileName:
      typeof record.pdfFileName === "string" ? record.pdfFileName : undefined,
    pdfPath: typeof record.pdfPath === "string" ? record.pdfPath : undefined,
    createdAt:
      typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt:
      typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    archivedAt:
      typeof record.archivedAt === "string" || record.archivedAt === null
        ? record.archivedAt
        : undefined,
  };
}

function HouseTechnicalPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="inline-flex rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
        CMS placeholder
      </div>

      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
        {description}
      </p>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5">
        <div className="text-sm font-medium text-white">
          Техническая заглушка
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Публичная страница для этого раздела уже предусмотрена в структуре
          сайта дома. Здесь зафиксировано безопасное место под будущий CMS
          editor без изменения existing public rendering path.
        </p>
      </div>
    </div>
  );
}

export default async function AdminHouseDetailPage({
  params,
  searchParams,
}: AdminHouseDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const activeBlock = normalizeBlock(resolvedSearchParams.block);

  const currentUser = await getCurrentAdminUser();
  const access = getResolvedAccess(currentUser?.role);

  const house = await getAdminHouseById(id);

  if (!house) {
    notFound();
  }

  const basePublicUrl = `https://${house.slug}.osbb-platform.com.ua`;

  const publicPreviewHref =
    {
      announcements: `${basePublicUrl}/announcements`,
      board: `${basePublicUrl}/board`,
      information: `${basePublicUrl}/information`,
      reports: `${basePublicUrl}/reports`,
      debtors: `${basePublicUrl}/debtors`,
      plan: `${basePublicUrl}/plan`,
      meetings: `${basePublicUrl}/meetings`,
      requisites: `${basePublicUrl}/requisites`,
      specialists: `${basePublicUrl}/specialists`,
    }[activeBlock] ?? basePublicUrl;

  let pages = await getAdminHousePages(house.id);
  let informationPage =
    activeBlock === "information"
      ? pages.find((page) => page.slug === "information") ?? null
      : null;

  if (activeBlock === "information" && !informationPage) {
    await ensureHouseInformationPage({ houseId: house.id });
    pages = await getAdminHousePages(house.id);
    informationPage =
      pages.find((page) => page.slug === "information") ?? null;
  }

  let homePage = pages.find((page) => page.slug === "home") ?? null;

  const needsHomePageForBlock =
    activeBlock === "announcements" ||
    activeBlock === "board" ||
    activeBlock === "specialists" ||
    activeBlock === "reports" ||
    activeBlock === "debtors" ||
    activeBlock === "plan" ||
    activeBlock === "meetings";

  if (needsHomePageForBlock && !homePage) {
    await ensureHouseHomePage({ houseId: house.id });
    pages = await getAdminHousePages(house.id);
    homePage = pages.find((page) => page.slug === "home") ?? null;
  }

  const needsHomeSectionsForBlock =
    activeBlock === "announcements" ||
    activeBlock === "board" ||
    activeBlock === "specialists" ||
    activeBlock === "reports" ||
    activeBlock === "debtors" ||
    activeBlock === "plan" ||
    activeBlock === "meetings" ||
    activeBlock === "requisites";

  let homeSections =
    needsHomeSectionsForBlock && homePage
      ? await getAdminHouseSections(homePage.id)
      : [];

  const validAnnouncementSections =
    activeBlock === "announcements"
      ? (
          await Promise.all(
            homeSections
              .filter((section) => section.kind === "announcements")
              .map((section) => getAdminHouseSectionById(section.id)),
          )
        ).filter(
          (
            section,
          ): section is NonNullable<typeof section> => Boolean(section),
        )
      : [];

  const boardSectionList =
    homeSections.find((section) => section.kind === "contacts") ?? null;

  let boardSection = null;

  if (activeBlock === "board" && homePage && !boardSectionList) {
    const ensuredBoardSectionId = await ensureHouseBoardSection({
      housePageId: homePage.id,
      houseSlug: house.slug,
    });

    boardSection = await getAdminHouseSectionById(ensuredBoardSectionId);
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (boardSectionList) {
    boardSection = await getAdminHouseSectionById(boardSectionList.id);
  }

  if (
    activeBlock === "information" &&
    !pages.find((page) => page.slug === "information")
  ) {
    await ensureHouseInformationPage({ houseId: house.id });
    pages = await getAdminHousePages(house.id);
  }


  const informationSections = informationPage
    ? await getAdminHouseSections(informationPage.id)
    : [];

  const validInformationPostSections =
    activeBlock === "information"
      ? (
          await Promise.all(
            informationSections
              .filter((section) => section.kind === "rich_text")
              .map((section) => getAdminHouseSectionById(section.id)),
          )
        ).filter(
          (
            section,
          ): section is NonNullable<typeof section> => Boolean(section),
        )
      : [];

  const faqSections =
    activeBlock === "information"
      ? (
          await Promise.all(
            informationSections
              .filter((section) => section.kind === "faq")
              .map((section) => getAdminHouseSectionById(section.id)),
          )
        ).filter(
          (
            section,
          ): section is NonNullable<typeof section> => Boolean(section),
        )
      : [];

  const specialistsSectionList =
    homeSections.find((section) => section.kind === "specialists") ?? null;

  let specialistsSection = null;

  if (activeBlock === "specialists" && homePage && !specialistsSectionList) {
    const ensuredSpecialistsSectionId = await ensureHouseSpecialistsSection({
      housePageId: homePage.id,
      houseSlug: house.slug,
    });

    specialistsSection = await getAdminHouseSectionById(
      ensuredSpecialistsSectionId,
    );
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (activeBlock === "specialists" && specialistsSectionList) {
    specialistsSection = await getAdminHouseSectionById(specialistsSectionList.id);
  } else if (activeBlock !== "specialists") {
    specialistsSection = null;
  }

  const reportsSectionList =
    homeSections.find((section) => section.kind === "reports") ?? null;

  let reportsSection = null;

  if (activeBlock === "reports" && homePage && !reportsSectionList) {
    const ensuredReportsSectionId = await ensureHouseReportsSection({
      housePageId: homePage.id,
    });

    reportsSection = await getAdminHouseSectionById(
      ensuredReportsSectionId,
    );
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (activeBlock === "reports" && reportsSectionList) {
    reportsSection = await getAdminHouseSectionById(reportsSectionList.id);
  } else if (activeBlock !== "reports") {
    reportsSection = null;
  }

  const planSectionList =
    homeSections.find((section) => section.kind === "plan") ?? null;

  let planSection = null;

  if (activeBlock === "plan" && homePage && !planSectionList) {
    const ensuredPlanSectionId = await ensureHousePlanSection({
      housePageId: homePage.id,
    });

    planSection = await getAdminHouseSectionById(
      ensuredPlanSectionId,
    );
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (activeBlock === "plan" && planSectionList) {
    planSection = await getAdminHouseSectionById(planSectionList.id);
  } else if (activeBlock !== "plan") {
    planSection = null;
  }

  const debtorsSectionList =
    homeSections.find((section) => section.kind === "debtors") ?? null;

  let debtorsSection = null;

  if (activeBlock === "debtors" && homePage && !debtorsSectionList) {
    const ensuredDebtorsSectionId = await ensureHouseDebtorsSection({
      housePageId: homePage.id,
    });

    debtorsSection = await getAdminHouseSectionById(
      ensuredDebtorsSectionId,
    );
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (activeBlock === "debtors" && debtorsSectionList) {
    debtorsSection = await getAdminHouseSectionById(debtorsSectionList.id);
  } else if (activeBlock !== "debtors") {
    debtorsSection = null;
  }

  const meetingsSectionList =
    homeSections.find((section) => section.kind === "meetings") ?? null;

  let meetingsSection = null;

  if (activeBlock === "meetings" && homePage && !meetingsSectionList) {
    const ensuredMeetingsSectionId = await ensureHouseMeetingsSection({
      housePageId: homePage.id,
    });

    meetingsSection = await getAdminHouseSectionById(
      ensuredMeetingsSectionId,
    );
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (activeBlock === "meetings" && meetingsSectionList) {
    meetingsSection = await getAdminHouseSectionById(meetingsSectionList.id);
  } else if (activeBlock !== "meetings") {
    meetingsSection = null;
  }

  const requisitesSectionList =
    homeSections.find((section) => section.kind === "requisites") ?? null;

  let requisitesSection = null;

  if (activeBlock === "requisites" && homePage && !requisitesSectionList) {
    const ensuredRequisitesSectionId = await ensureHouseRequisitesSection({
      housePageId: homePage.id,
    });

    requisitesSection = await getAdminHouseSectionById(
      ensuredRequisitesSectionId,
    );
    homeSections = await getAdminHouseSections(homePage.id);
  } else if (activeBlock === "requisites" && requisitesSectionList) {
    requisitesSection = await getAdminHouseSectionById(
      requisitesSectionList.id,
    );
  } else if (activeBlock !== "requisites") {
    requisitesSection = null;
  }

  const specialistRequests =
    activeBlock === "specialists"
      ? await getHouseSpecialistContactRequests(house.id)
      : [];


  const documents =
    activeBlock === "information"
      ? await getHouseDocuments(house.id)
      : [];

  const reports =
    activeBlock === "reports" &&
    Array.isArray(getSectionContent(reportsSection).reports)
      ? (getSectionContent(reportsSection).reports as unknown[])
          .map(normalizeReportItem)
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];

  const debtorsApartments =
    activeBlock === "debtors"
      ? (await getAdminHouseApartments({ houseId: house.id })).items
      : [];

  const meetingsApartments =
    activeBlock === "meetings"
      ? (await getAdminHouseApartments({ houseId: house.id })).items
      : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link
                href="/admin/houses"
                className="transition hover:text-white"
              >
                Дома
              </Link>
              <span>/</span>
              <span className="text-white">{house.name}</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {house.name}
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
              Рабочая панель управления разделами и контентом сайта дома.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                slug: {house.slug}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                {house.is_active ? "Активен" : "Архив"}
              </span>
              {house.district ? (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: house.district.theme_color }}
                >
                  {house.district.name}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Раздел: {
                  {
                    announcements: "Объявления",
                    board: "Правление",
                    information: "Информация",
                    reports: "Отчеты",
                    debtors: "Должники",
                    plan: "План работ",
                    meetings: "Собрания",
                    requisites: "Реквизиты",
                    specialists: "Специалисты",
                  }[activeBlock]
                }
              </span>
            </div>

            <div className="mt-4 text-sm text-slate-500">
              {house.address}
              {house.osbb_name ? ` · ОСББ: ${house.osbb_name}` : ""}
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 xl:w-auto xl:items-end">
            <div className="w-full xl:w-[320px]">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Раздел дома
              </div>
              <HouseBlockSelector
                houseId={house.id}
                activeBlock={activeBlock}
              />
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-3">
              <Link
                href={publicPreviewHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800"
                aria-label={`Открыть сайт дома ${house.name}`}
                title="Открыть сайт дома"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
                  <circle cx="12" cy="12" r="3.25" />
                </svg>
              </Link>

              <Link
                href="/admin/houses"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Назад к реестру
              </Link>
            </div>
          </div>
        </div>
      </div>

      {activeBlock === "announcements" ? (
        <HouseAnnouncementsWorkspace
          houseId={house.id}
          houseSlug={house.slug}
          housePageId={homePage?.id ?? null}
          sections={validAnnouncementSections.map(normalizeSectionForWorkspace)}
        />
      ) : null}

      {activeBlock === "board" ? (
        boardSection ? (
          <EditBoardSectionForm
            readOnlyMode={!access.houseWorkspaces.board.edit}
            houseId={house.id}
            houseSlug={house.slug}
            section={{
              id: boardSection.id,
              title: boardSection.title,
              status: boardSection.status,
              content: getSectionContent(boardSection),
            }}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="Правление"
            description="Не удалось подготовить секцию правления для этого дома. Нужно проверить наличие страницы home и корректность house bootstrap."
          />
        )
      ) : null}

      {activeBlock === "reports" ? (
        reportsSection ? (
          <HouseReportsWorkspace
            readOnlyMode={!access.houseWorkspaces.reports.edit}
            houseId={house.id}
            houseSlug={house.slug}
            sectionId={reportsSection.id}
            sectionTitle={reportsSection.title}
            sectionStatus={reportsSection.status}
            reports={reports}
            categoriesCatalog={
              Array.isArray(getSectionContent(reportsSection).categoriesCatalog)
                ? getSectionContent(reportsSection).categoriesCatalog as string[]
                : []
            }
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="Отчеты дома"
            description="Секция reports пока не создана для этого дома. Следующим шагом добавим safe bootstrap секции, если ее нет."
          />
        )
      ) : null}

      {activeBlock === "information" ? (
        <HouseInformationWorkspace
          houseId={house.id}
          houseSlug={house.slug}
          housePageId={informationPage?.id ?? null}
          posts={validInformationPostSections.map(normalizeSectionForWorkspace)}
          documents={documents}
          faqSections={faqSections.map(normalizeSectionForWorkspace)}
        />
      ) : null}

      {activeBlock === "debtors" ? (
        <HouseDebtorsWorkspace
          houseId={house.id}
          houseSlug={house.slug}
          apartments={debtorsApartments}
          section={
            debtorsSection
              ? {
                  id: debtorsSection.id,
                  title: debtorsSection.title,
                  content: getSectionContent(debtorsSection),
                }
              : null
          }
        />
      ) : null}

      {activeBlock === "plan" ? (
        planSection ? (
          <HousePlanWorkspace
            canChangeWorkflowStatus={access.houseWorkspaces.plan.changeWorkflowStatus}
            houseId={house.id}
            houseSlug={house.slug}
            section={{
              id: planSection.id,
              title: planSection.title,
              status: planSection.status,
              content: getSectionContent(planSection),
            }}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="План работ"
            description="Не удалось подготовить секцию плана работ для этого дома. Нужно проверить home page bootstrap."
          />
        )
      ) : null}

      {activeBlock === "meetings" ? (
        meetingsSection ? (
          <HouseMeetingsWorkspace
            canChangeWorkflowStatus={access.houseWorkspaces.meetings.changeWorkflowStatus}
            houseId={house.id}
            houseSlug={house.slug}
            hasApartments={meetingsApartments.length > 0}
            apartments={meetingsApartments.map((apartment) => ({
              id: apartment.id,
              apartmentLabel: apartment.apartment_label,
              ownerName: apartment.owner_name,
            }))}
            section={{
              id: meetingsSection.id,
              title: meetingsSection.title,
              status: meetingsSection.status,
              content: getSectionContent(meetingsSection),
            }}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="Собрания"
            description="Не удалось подготовить meetings section для этого дома. Нужно проверить bootstrap home page."
          />
        )
      ) : null}

      {activeBlock === "requisites" ? (
        <HouseRequisitesWorkspace
          readOnlyMode={!access.houseWorkspaces.requisites.edit}
          houseId={house.id}
          houseSlug={house.slug}
          section={
            requisitesSection
              ? {
                  id: requisitesSection.id,
                  title: requisitesSection.title,
                  content: getSectionContent(requisitesSection),
                }
              : null
          }
        />
      ) : null}

      {activeBlock === "specialists" ? (
        specialistsSection ? (
          <HouseSpecialistsWorkspace
            houseId={house.id}
            houseSlug={house.slug}
            section={{
              id: specialistsSection.id,
              title: specialistsSection.title,
              status: specialistsSection.status,
              content: getSectionContent(specialistsSection),
            }}
            requests={specialistRequests}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="Специалисты"
            description="Не удалось подготовить секцию специалистов для этого дома. Нужно проверить наличие страницы home и корректность house bootstrap."
          />
        )
      ) : null}

    </div>
  );
}
