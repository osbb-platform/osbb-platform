import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";
import type { AdminRole } from "@/src/shared/constants/roles/roles.constants";
import type {
  HouseWorkspaceKey,
  WorkspaceActionKey,
} from "@/src/shared/permissions/rbac.types";

type GuardResult = {
  error: string | null;
};

export function assertRegistryActionAccess(params: {
  role: AdminRole | null | undefined;
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
          import: false,
          archive: access.housesRegistry.archive,
          restore: access.housesRegistry.restore,
          delete: access.housesRegistry.delete,
          bulk: false,
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

export function assertWorkspaceAction(params: {
  role: AdminRole | null | undefined;
  workspace: HouseWorkspaceKey;
  action: WorkspaceActionKey;
}): GuardResult | null {
  const access = getResolvedAccess(params.role);
  const allowed = access.houseWorkspaces[params.workspace]?.[params.action] ?? false;

  if (allowed) {
    return null;
  }

  return {
    error: "У вас недостаточно прав для выполнения этого действия.",
  };
}
