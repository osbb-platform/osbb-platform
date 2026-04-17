import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";
import type { CurrentAdminRole } from "@/src/shared/types/entities/admin.types";

type GuardResult = {
  error: string | null;
};

export function assertRegistryActionAccess(params: {
  role: CurrentAdminRole | null | undefined;
  area: "houses" | "apartments";
  action:
    | "create"
    | "edit"
    | "archive"
    | "restore"
    | "delete"
    | "import"
    | "bulk"
    | "security";
}): GuardResult | null {
  const access = getResolvedAccess(params.role);

  const allowed =
    params.area === "houses"
      ? {
          create: access.housesRegistry.create,
          edit: access.housesRegistry.edit,
          archive: access.housesRegistry.archive,
          restore: access.housesRegistry.restore,
          delete: access.housesRegistry.delete,
          security: access.housesRegistry.changeAccessCode,
        }[params.action]
      : {
          create: access.apartmentsRegistry.createManual,
          import: access.apartmentsRegistry.importReplace,
          archive:
            access.apartmentsRegistry.archiveOne ||
            access.apartmentsRegistry.archiveAll,
          bulk: access.apartmentsRegistry.createManual,
          delete: false,
          edit: false,
          restore: false,
          security: false,
        }[params.action];

  if (allowed) {
    return null;
  }

  return {
    error: "У вас недостаточно прав для выполнения этого действия.",
  };
}
