import { CitiesRegistryWorkspace } from "@/src/modules/cities/components/CitiesRegistryWorkspace";
import { getAdminCities } from "@/src/modules/cities/services/getAdminCities";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export const dynamic = "force-dynamic";

export default async function AdminCitiesPage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "cities");

  const cities = await getAdminCities();

  return <CitiesRegistryWorkspace cities={cities} />;
}
