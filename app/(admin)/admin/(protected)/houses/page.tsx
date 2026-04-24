import { redirect } from "next/navigation";
import { getAdminDistricts } from "@/src/modules/districts/services/getAdminDistricts";
import { HousesRegistryWorkspace } from "@/src/modules/houses/components/HousesRegistryWorkspace";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { getManagementCompanies } from "@/src/modules/houses/services/getManagementCompanies";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export const dynamic = "force-dynamic";

export default async function AdminHousesPage() {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect("/admin/login");
  }

  assertTopLevelAccess(currentUser.role, "houses");

  const [houses, districts, managementCompanies] = await Promise.all([
    getAdminHouses(),
    getAdminDistricts(),
    getManagementCompanies(),
  ]);

  return (
    <HousesRegistryWorkspace
      houses={houses}
      districts={districts}
      managementCompanies={managementCompanies}
      currentUser={currentUser}
    />
  );
}
