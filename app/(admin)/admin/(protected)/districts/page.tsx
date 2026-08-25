import { DistrictsRegistryWorkspace } from "@/src/modules/districts/components/DistrictsRegistryWorkspace";
import { getAdminDistricts } from "@/src/modules/districts/services/getAdminDistricts";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getAdminCityOptions } from "@/src/modules/auth/services/getAdminCityOptions";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export const dynamic = "force-dynamic";

export default async function AdminDistrictsPage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "districts");

  const isSuperadmin = currentUser?.role === ROLES.SUPERADMIN;

  const [districts, cityContext, cityOptions] = await Promise.all([
    getAdminDistricts(),
    getAdminCityContext(),
    isSuperadmin ? getAdminCityOptions() : Promise.resolve([]),
  ]);

  const cities = isSuperadmin
    ? cityOptions
    : cityContext
      ? [
          {
            id: cityContext.cityId,
            name: cityContext.cityName,
            slug: cityContext.citySlug,
          },
        ]
      : [];

  return (
    <DistrictsRegistryWorkspace
      districts={districts}
      cities={cities}
      activeCityId={cityContext?.cityId ?? null}
      currentUserRole={currentUser?.role ?? null}
    />
  );
}
