import { DistrictsRegistryWorkspace } from "@/src/modules/districts/components/DistrictsRegistryWorkspace";
import { getAdminDistricts } from "@/src/modules/districts/services/getAdminDistricts";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export const dynamic = "force-dynamic";

export default async function AdminDistrictsPage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "districts");

  const districts = await getAdminDistricts();

  return (
    <DistrictsRegistryWorkspace
      districts={districts}
      currentUserRole={currentUser?.role ?? null}
    />
  );
}
