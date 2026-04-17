import { notFound } from "next/navigation";
import { HouseAnnouncementsWorkspace } from "@/src/modules/houses/components/HouseAnnouncementsWorkspace";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { getAdminHousePages } from "@/src/modules/houses/services/getAdminHousePages";
import { getAdminHouseSectionById } from "@/src/modules/houses/services/getAdminHouseSectionById";
import { getAdminHouseSections } from "@/src/modules/houses/services/getAdminHouseSections";

type AdminHouseAnnouncementsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminHouseAnnouncementsPage({
  params,
}: AdminHouseAnnouncementsPageProps) {
  const { id } = await params;

  const house = await getAdminHouseById(id);

  if (!house) {
    notFound();
  }

  const pages = await getAdminHousePages(house.id);

  const homePage = pages.find((page) => page.slug === "home") ?? null;
  const homeSections = homePage
    ? await getAdminHouseSections(homePage.id)
    : [];

  const announcementSectionMetas = homeSections.filter(
    (section) => section.kind === "announcements",
  );

  const announcementSections = await Promise.all(
    announcementSectionMetas.map((section) =>
      getAdminHouseSectionById(section.id),
    ),
  );

  const validAnnouncementSections = announcementSections.filter(
    (section): section is NonNullable<typeof section> => Boolean(section),
  );

  return (
    <HouseAnnouncementsWorkspace
      houseId={house.id}
      houseSlug={house.slug}
      housePageId={homePage?.id ?? null}
      sections={validAnnouncementSections.map((section) => ({
        id: section.id,
        title: section.title,
        status: section.status,
        content: section.content,
      }))}
    />
  );
}
