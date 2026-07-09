import { notFound } from "next/navigation";
import { HouseAnnouncementsWorkspace } from "@/src/modules/houses/components/HouseAnnouncementsWorkspace";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { getAdminHousePages } from "@/src/modules/houses/services/getAdminHousePages";
import { getAdminHouseAnnouncements } from "@/src/modules/houses/services/getAdminHouseAnnouncements";

import { getAdminHouses, type AdminHouseListItem } from "@/src/modules/houses/services/getAdminHouses";
import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";


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
    pdf: announcement.pdf ?? null,
    },
  }));

  const duplicateTargets = mapCrossHouseDuplicateTargets(
    await getAdminHouses(),
    house.id,
  );

  return (
    <HouseAnnouncementsWorkspace
      houseId={house.id}
      houseSlug={house.slug}
      housePageId={homePage?.id ?? null}
      sections={validAnnouncementSections}
      duplicateTargets={duplicateTargets}
    />
  );
}
