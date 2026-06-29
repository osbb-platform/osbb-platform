import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { redirect } from "next/navigation";
import { getAdminDistricts } from "@/src/modules/districts/services/getAdminDistricts";
import { HousesRegistryWorkspace } from "@/src/modules/houses/components/HousesRegistryWorkspace";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { getManagementCompanies } from "@/src/modules/houses/services/getManagementCompanies";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export const dynamic = "force-dynamic";

export default async function AdminHousesPage() {
  const [currentUser, houses, districts, managementCompanies] = await Promise.all([
    getCurrentAdminUser(),
    getAdminHouses(),
    getAdminDistricts(),
    getManagementCompanies(),
  ]);

  if (!currentUser) {
    redirect(ROUTES.admin.login);
  }

  assertTopLevelAccess(currentUser.role, "houses");

  const safeHouses = Array.isArray(houses) ? houses : [];
  const safeDistricts = Array.isArray(districts) ? districts : [];
  const safeManagementCompanies = Array.isArray(managementCompanies)
    ? managementCompanies
    : [];

  return (
    <HousesRegistryWorkspace
      houses={safeHouses}
      districts={safeDistricts}
      managementCompanies={safeManagementCompanies}
      currentUser={currentUser}
    />
  );
}
