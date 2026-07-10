import { houseOrigin } from "@/src/shared/config/app/domains";
import { ROUTES } from "@/src/shared/config/routes/routes.config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseAnnouncementsWorkspace } from "@/src/modules/houses/components/HouseAnnouncementsWorkspace";
import { EditBoardSectionForm } from "@/src/modules/houses/components/EditBoardSectionForm";
import { HouseBlockNavigationFrame } from "@/src/modules/houses/components/HouseBlockNavigationFrame";
import { HouseBlockSelector } from "@/src/modules/houses/components/HouseBlockSelector";
import { HouseMeetingsWorkspace } from "@/src/modules/houses/components/HouseMeetingsWorkspace";
import { HouseInformationWorkspace } from "@/src/modules/houses/components/HouseInformationWorkspace";
import { HouseDocumentsWorkspace } from "@/src/modules/houses/components/HouseDocumentsWorkspace";
import { HouseReportsWorkspace } from "@/src/modules/houses/components/HouseReportsWorkspace";
import { HousePlanWorkspace } from "@/src/modules/houses/components/HousePlanWorkspace";
import { HouseDebtorsWorkspace } from "@/src/modules/houses/components/HouseDebtorsWorkspace";
import { HouseSpecialistsWorkspace } from "@/src/modules/houses/components/HouseSpecialistsWorkspace";
import { HouseRequisitesWorkspace } from "@/src/modules/houses/components/HouseRequisitesWorkspace";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { getAdminHousePages } from "@/src/modules/houses/services/getAdminHousePages";
import { getAdminHouseAnnouncements } from "@/src/modules/houses/services/getAdminHouseAnnouncements";
import { getHouseSpecialistContactRequests } from "@/src/modules/houses/services/getHouseSpecialistContactRequests";
import { getAdminHouseDebtors } from "@/src/modules/houses/services/getAdminHouseDebtors";
import { getAdminHouseMeetings } from "@/src/modules/houses/services/getAdminHouseMeetings";
import { getAdminHouseRequisites } from "@/src/modules/houses/services/getAdminHouseRequisites";
import { getAdminHouseFaq } from "@/src/modules/houses/services/getAdminHouseFaq";
import { getAdminHouseInformationPosts } from "@/src/modules/houses/services/getAdminHouseInformationPosts";
import { getAdminHouseSpecialists } from "@/src/modules/houses/services/getAdminHouseSpecialists";
import { getAdminHousePlan } from "@/src/modules/houses/services/getAdminHousePlan";
import { getAdminHouseBoard } from "@/src/modules/houses/services/getAdminHouseBoard";
import { getAdminHouseReports } from "@/src/modules/houses/services/getAdminHouseReports";
import { getAdminContentTemplates } from "@/src/modules/houses/services/getAdminContentTemplates";
import { getAdminHouseApartments } from "@/src/modules/apartments/services/getAdminHouseApartments";
import { getHouseDocuments } from "@/src/modules/houses/services/getHouseDocuments";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

import { getAdminHouses, type AdminHouseListItem } from "@/src/modules/houses/services/getAdminHouses";
import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { AdminActionIconLink } from "@/src/shared/ui/admin/AdminActionIconButton";
import { HouseEntityBadge } from "@/src/shared/ui/admin/HouseEntityBadge";


function mapCrossHouseDuplicateTargets(
  houses: AdminHouseListItem[],
  currentHouseId: string,
): CrossHouseDuplicateTarget[] {
  return houses
    .filter((house) => house.id !== currentHouseId)
    .map((house) => ({
      id: house.id,
      name: house.name,
      slug: house.slug,
      address: house.address,
      districtName: house.district?.name ?? null,
      isActive: house.is_active,
      archivedAt: house.archived_at,
    }));
}

type AdminHouseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    block?: string;
  }>;
};

const allowedBlocks = new Set([
  "hero",
  "announcements",
  "board",
  "information",
  "reports",
  "debtors",
  "plan",
  "meetings",
  "requisites",
  "specialists",
  "founding-documents",
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
  status?: "draft" | "published" | "archived";
  content?: Record<string, unknown>;
}>(section: T) {
  return {
    id: section.id,
    title: section.title ?? "Без назви",
    status: section.status ?? "draft",
    content: section.content ?? {},
  };
}

function normalizeAnnouncementForWorkspace(announcement: {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "danger";
  is_pinned?: boolean;
  lifecycle_status: "draft" | "published" | "archived";
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}) {
  return {
    id: announcement.id,
    title: announcement.title,
    status: announcement.lifecycle_status,
    content: {
      body: announcement.body,
      level: announcement.level,
      isPinned: Boolean(announcement.is_pinned),
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
      publishedAt: announcement.published_at,
      lockVersion: announcement.lock_version,
    },
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
    <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <div className="inline-flex rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
        CMS заповнювач
      </div>

      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--cms-text)]">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--cms-text-muted)]">
        {description}
      </p>

      <div className="mt-6 rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-muted)]/60 p-5">
        <div className="text-sm font-medium text-[var(--cms-text)]">
          Технічна заглушка
        </div>

        <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
          Публічна сторінка для цього розділу вже передбачена у структурі
          сайту будинку. Тут зафіксовано безпечне місце під майбутній CMS
          редактор без зміни наявного public rendering path.
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

  const basePublicUrl = houseOrigin(house.slug);

  const publicPreviewHref =
    {
      hero: basePublicUrl,
      announcements: `${basePublicUrl}/announcements`,
      board: `${basePublicUrl}/board`,
      information: `${basePublicUrl}/information`,
      reports: `${basePublicUrl}/reports`,
      debtors: `${basePublicUrl}/debtors`,
      plan: `${basePublicUrl}/plan`,
      meetings: `${basePublicUrl}/meetings`,
      requisites: `${basePublicUrl}/requisites`,
      specialists: `${basePublicUrl}/specialists`,
      "founding-documents": `${basePublicUrl}/founding-documents`,
    }[activeBlock] ?? basePublicUrl;

  const pages = await getAdminHousePages(house.id);
  const informationPage =
    activeBlock === "information"
      ? pages.find((page) => page.slug === "information") ?? null
      : null;

  const homePage = pages.find((page) => page.slug === "home") ?? null;

  const validAnnouncementSections =
    activeBlock === "announcements"
      ? (await getAdminHouseAnnouncements({ houseId: house.id })).map(
          normalizeAnnouncementForWorkspace,
        )
      : [];

  const board =
    activeBlock === "board" ? await getAdminHouseBoard(house.id) : null;

  const validInformationPostSections =
    activeBlock === "information"
      ? await getAdminHouseInformationPosts({ houseId: house.id })
      : [];

  const faqs =
    activeBlock === "information" ? await getAdminHouseFaq(house.id) : [];

  const specialistsData =
    activeBlock === "specialists"
      ? await getAdminHouseSpecialists({ houseId: house.id })
      : null;

  const planData =
    activeBlock === "plan"
      ? await getAdminHousePlan({ houseId: house.id })
      : null;

  const debtorsData =
    activeBlock === "debtors"
      ? await getAdminHouseDebtors({ houseId: house.id })
      : null;

  const meetingsData =
    activeBlock === "meetings"
      ? await getAdminHouseMeetings({ houseId: house.id })
      : null;

  const requisites =
    activeBlock === "requisites"
      ? await getAdminHouseRequisites({ houseId: house.id })
      : null;

  const specialistRequests =
    activeBlock === "specialists"
      ? await getHouseSpecialistContactRequests(house.id)
      : [];


  const documents =
    activeBlock === "information"
      ? await getHouseDocuments(house.id, { scope: "information" })
      : [];

  const foundingDocuments =
    activeBlock === "founding-documents"
      ? await getHouseDocuments(house.id, { scope: "founding" })
      : [];

  const reportsData =
    activeBlock === "reports"
      ? await getAdminHouseReports({ houseId: house.id })
      : null;

  const faqTemplates =
    activeBlock === "information"
      ? await getAdminContentTemplates({ sectionKind: "faq" })
      : [];

  const informationPostTemplates =
    activeBlock === "information"
      ? await getAdminContentTemplates({ sectionKind: "information_post" })
      : [];

  const specialistTemplates =
    activeBlock === "specialists"
      ? await getAdminContentTemplates({ sectionKind: "specialists" })
      : [];

  const debtorsApartments =
    activeBlock === "debtors"
      ? (await getAdminHouseApartments({ houseId: house.id })).items
      : [];

  const meetingsApartments =
    activeBlock === "meetings"
      ? (await getAdminHouseApartments({ houseId: house.id })).items
      : [];

  const duplicateTargets = mapCrossHouseDuplicateTargets(
    await getAdminHouses(),
    house.id,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--cms-text-muted)]">
              <Link
                href={ROUTES.admin.houses}
                className="text-[var(--cms-text-muted)] transition hover:text-[var(--cms-text)]"
              >
                Будинки
              </Link>
              <span>/</span>
              <span className="text-[var(--cms-text)]">{house.name}</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--cms-text)]">
              {house.name}
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--cms-text-muted)]">
              {house.address}
              {house.osbb_name ? ` · ОСББ: ${house.osbb_name}` : ""}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <HouseEntityBadge variant="slug" title={house.slug}>
                {house.slug}
              </HouseEntityBadge>
              {!house.is_active ? (
                <span className="rounded-[var(--r-pill)] bg-[var(--cms-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--cms-text)]">
                  Архів
                </span>
              ) : null}
              {house.district ? (
                <span
                  className="inline-flex h-8 items-center rounded-[var(--r-pill)] px-3 text-xs font-semibold leading-none text-[var(--cms-text)] shadow-[var(--cms-shadow-sm)]"
                  style={{ backgroundColor: house.district.theme_color }}
                >
                  {house.district.name}
                </span>
              ) : null}
              {house.management_company?.name ? (
                <HouseEntityBadge
                  variant="managementCompany"
                  title={house.management_company.name}
                >
                  {house.management_company.name}
                </HouseEntityBadge>
              ) : null}
              <span className="rounded-[var(--r-pill)] bg-[var(--cms-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--cms-text)]">
                Розділ: {
                  {
                    announcements: "Оголошення",
                    board: "Правління",
                    information: "Інформація",
                    reports: "Звіти",
                    debtors: "Боржники",
                    plan: "План робіт",
                    meetings: "Збори",
                    requisites: "Реквізити",
                    specialists: "Спеціалісти",
                    "founding-documents": "Установчі документи",
                  }[activeBlock]
                }
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 xl:w-auto xl:items-end">
            <div className="flex w-full flex-wrap items-center justify-end gap-3">
              <AdminActionIconLink
                href={publicPreviewHref}
                icon="publicPage"
                label={`Відкрити сайт будинку ${house.name}`}
                tooltip="Відкрити сайт будинку"
                target="_blank"
                rel="noreferrer"
                size="lg"
                tone="accent"
              />

              <AdminActionIconLink
                href={ROUTES.admin.houses}
                icon="back"
                label="Назад до реєстру будинків"
                tooltip="Назад до реєстру"
                size="lg"
              />
            </div>

            <div className="w-full min-w-[260px] xl:max-w-[360px]">
              <HouseBlockSelector
                houseId={house.id}
                activeBlock={activeBlock}
              />
            </div>
          </div>
        </div>
      </div>

      <HouseBlockNavigationFrame
        houseId={house.id}
        activeBlock={activeBlock}
        hideSelector
      >
      {activeBlock === "announcements" ? (
        <HouseAnnouncementsWorkspace
          houseId={house.id}
          houseSlug={house.slug}
          housePageId={homePage?.id ?? null}
          sections={validAnnouncementSections.map(normalizeSectionForWorkspace)}
        duplicateTargets={duplicateTargets}
        />
      ) : null}

      {activeBlock === "board" ? (
        board ? (
          <EditBoardSectionForm
            readOnlyMode={!access.houseWorkspaces.board.edit}
            houseId={house.id}
            houseSlug={house.slug}
            board={board}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="Правління"
            description="Не вдалося підготувати секцію правління для цього будинку. Потрібно перевірити коректність ініціалізації будинку."
          />
        )
      ) : null}

      {activeBlock === "reports" && reportsData ? (
        <HouseReportsWorkspace
          readOnlyMode={!access.houseWorkspaces.reports.edit}
          houseId={house.id}
          reports={reportsData.reports}
          categories={reportsData.categories}
        duplicateTargets={duplicateTargets}
        />
      ) : null}

      {activeBlock === "information" ? (
        <HouseInformationWorkspace
          houseId={house.id}
          houseSlug={house.slug}
          housePageId={informationPage?.id ?? null}
          posts={validInformationPostSections}
          documents={documents}
          faqs={faqs}
          faqTemplates={faqTemplates}
          informationPostTemplates={informationPostTemplates}
        duplicateTargets={duplicateTargets}
        />
      ) : null}

      {activeBlock === "founding-documents" ? (
        <HouseDocumentsWorkspace
          houseId={house.id}
          documents={foundingDocuments}
          documentScope="founding"
          headingTitle="Установчі документи"
          createTitle="Новий установчий документ"
          editTitle="Редагування установчого документа"
          emptyTitle="Установчі документи поки не додані. Створи перший документ через кнопку «Новий документ»."
          canConfirm={access.houseWorkspaces.foundingDocuments.confirm}
          canArchive={access.houseWorkspaces.foundingDocuments.archive}
          canDelete={access.houseWorkspaces.foundingDocuments.delete}
        duplicateTargets={duplicateTargets}
        />
      ) : null}

      {activeBlock === "debtors" ? (
        <HouseDebtorsWorkspace
          houseId={house.id}
          houseSlug={house.slug}
          exportTitle="Боржники"
          apartments={debtorsApartments}
          debtors={debtorsData}
        />
      ) : null}

      {activeBlock === "plan" ? (
        planData ? (
          <HousePlanWorkspace
            canChangeWorkflowStatus={access.houseWorkspaces.plan.changeWorkflowStatus}
            houseId={house.id}
            houseSlug={house.slug}
            plan={planData}
            duplicateTargets={duplicateTargets}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="План робіт"
            description="Не вдалося завантажити план робіт для цього будинку. Потрібно перевірити таблицю house_plan_tasks."
          />
        )
      ) : null}

      {activeBlock === "meetings" ? (
        meetingsData ? (
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
            meetings={meetingsData}
          />
        ) : (
          <HouseTechnicalPlaceholder
            title="Збори"
            description="Не вдалося завантажити збори для цього будинку. Потрібно перевірити таблицю house_meetings."
          />
        )
      ) : null}

      {activeBlock === "requisites" && requisites ? (
        <HouseRequisitesWorkspace
          readOnlyMode={!access.houseWorkspaces.requisites.edit}
          houseId={house.id}
          requisites={requisites}
        />
      ) : null}

      {activeBlock === "specialists" && specialistsData ? (
        <HouseSpecialistsWorkspace
          houseId={house.id}
          specialistsData={specialistsData}
          requests={specialistRequests}
          templates={specialistTemplates}
        duplicateTargets={duplicateTargets}
        />
      ) : null}

      </HouseBlockNavigationFrame>
    </div>
  );
}
