import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ApartmentsRegistryWorkspace } from "@/src/modules/apartments/components/ApartmentsRegistryWorkspace";
import { getAdminHouseApartments } from "@/src/modules/apartments/services/getAdminHouseApartments";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export const dynamic = "force-dynamic";

type AdminApartmentsPageProps = {
  searchParams?: Promise<{
    districtId?: string;
    houseId?: string;
    archived?: string;
  }>;
};

export default async function AdminApartmentsPage({
  searchParams,
}: AdminApartmentsPageProps) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect("/admin/login");
  }

  assertTopLevelAccess(currentUser.role, "apartments");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedDistrictId = String(resolvedSearchParams?.districtId ?? "").trim();
  const requestedHouseId = String(resolvedSearchParams?.houseId ?? "").trim();
  const archived = resolvedSearchParams?.archived === "1";

  const houses = await getAdminHouses();
  const activeHouses = houses.filter((house) => !house.archived_at && house.district);

  const districts = Array.from(
    new Map(
      activeHouses
        .filter((house) => house.district)
        .map((house) => [
          house.district!.id,
          {
            id: house.district!.id,
            name: house.district!.name,
          },
        ]),
    ).values(),
  );

  const selectedDistrictId =
    districts.some((district) => district.id === requestedDistrictId)
      ? requestedDistrictId
      : (districts[0]?.id ?? "");

  const districtHouses = activeHouses.filter(
    (house) => house.district?.id === selectedDistrictId,
  );

  const selectedHouseId =
    districtHouses.some((house) => house.id === requestedHouseId)
      ? requestedHouseId
      : (districtHouses[0]?.id ?? "");

  const apartmentsData = selectedHouseId
    ? await getAdminHouseApartments({
        houseId: selectedHouseId,
        archived,
      })
    : {
        items: [],
        summary: null,
      };

  return (
    <ApartmentsRegistryWorkspace
      districts={districts}
      houses={activeHouses.map((house) => ({
        id: house.id,
        name: house.name,
        districtId: house.district?.id ?? "",
      }))}
      selectedDistrictId={selectedDistrictId}
      selectedHouseId={selectedHouseId}
      archived={archived}
      items={apartmentsData.items}
      summary={apartmentsData.summary}
      currentUserRole={currentUser.role}
    />
  );
}
