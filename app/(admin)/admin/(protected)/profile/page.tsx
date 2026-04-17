import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { AdminProfileEditor } from "@/src/modules/auth/components/AdminProfileEditor";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { getResolvedAccess, assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

export default async function AdminProfilePage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "profile");

  const access = getResolvedAccess(currentUser?.role);
  const houses = access.security.viewHouseAccessCodes
    ? await getAdminHouses()
    : [];

  return (
    <div className="space-y-6">
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
