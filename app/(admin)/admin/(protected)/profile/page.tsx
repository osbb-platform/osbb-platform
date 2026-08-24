import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { AdminProfileEditor } from "@/src/modules/auth/components/AdminProfileEditor";
import { AdminCityProfileSelector } from "@/src/modules/auth/components/AdminCityProfileSelector";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getAdminCityOptions } from "@/src/modules/auth/services/getAdminCityOptions";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { getResolvedAccess, assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export default async function AdminProfilePage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "profile");

  const access = getResolvedAccess(currentUser?.role);
  const isSuperadmin = currentUser?.role === ROLES.SUPERADMIN;
  const [cityContext, cityOptions] = isSuperadmin
    ? await Promise.all([getAdminCityContext(), getAdminCityOptions()])
    : [null, []];

  const houses = access.security.viewHouseAccessCodes
    ? await getAdminHouses()
    : [];

  return (
    <div className="space-y-6">
      {isSuperadmin ? (
        <AdminCityProfileSelector
          cities={cityOptions}
          activeCityId={cityContext?.cityId ?? null}
        />
      ) : null}

      <AdminProfileEditor
        currentFullName={currentUser?.fullName ?? ""}
        currentEmail={currentUser?.email ?? ""}
        currentRole={currentUser?.role ?? null}
        currentStatus={currentUser?.status ?? null}
        currentJobTitle={currentUser?.jobTitle ?? ""}
        houses={houses.map((house) => ({
          id: house.id,
          name: house.name,
          slug: house.slug,
          currentAccessCode: house.current_access_code,
          districtId: house.district?.id ?? null,
          districtName: house.district?.name ?? "Без района",
        }))}
      />
    </div>
  );
}
