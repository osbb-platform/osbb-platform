import { notFound } from "next/navigation";
import { HouseAnnouncementsWorkspace } from "@/src/modules/houses/components/HouseAnnouncementsWorkspace";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { getAdminHousePages } from "@/src/modules/houses/services/getAdminHousePages";
import { getAdminHouseAnnouncements } from "@/src/modules/houses/services/getAdminHouseAnnouncements";

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
  const validAnnouncementSections = (
    await getAdminHouseAnnouncements({ houseId: house.id })
  ).map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    status: announcement.lifecycle_status,
    content: {
      body: announcement.body,
      level: announcement.level,
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
      publishedAt: announcement.published_at,
      lockVersion: announcement.lock_version,
    },
  }));

  return (
    <HouseAnnouncementsWorkspace
      houseId={house.id}
      houseSlug={house.slug}
      housePageId={homePage?.id ?? null}
      sections={validAnnouncementSections}
    />
  );
}
