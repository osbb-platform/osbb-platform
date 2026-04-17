import type { AdminRole } from "@/src/shared/constants/roles/roles.constants";
import type {
  CmsTopLevelSectionKey,
  HouseWorkspaceKey,
  WorkspaceActionKey,
} from "@/src/shared/permissions/rbac.types";
import {
  hasHouseWorkspaceAccess,
  hasTopLevelAccess,
  resolveRoleAccess,
} from "@/src/shared/permissions/rbac.resolve";

export function assertTopLevelAccess(
  role: AdminRole | null | undefined,
  section: CmsTopLevelSectionKey,
) {
  if (!hasTopLevelAccess(role, section)) {
    throw new Error(`RBAC_FORBIDDEN_TOP_LEVEL:${section}`);
  }
}

export function assertHouseWorkspaceAccess(
  role: AdminRole | null | undefined,
  workspace: HouseWorkspaceKey,
  action: WorkspaceActionKey,
) {
  if (!hasHouseWorkspaceAccess(role, workspace, action)) {
    throw new Error(`RBAC_FORBIDDEN_HOUSE_WORKSPACE:${workspace}:${action}`);
  }
}

export function canAccessTopLevel(
  role: AdminRole | null | undefined,
  section: CmsTopLevelSectionKey,
) {
  return hasTopLevelAccess(role, section);
}

export function canAccessHouseWorkspaceAction(
  role: AdminRole | null | undefined,
  workspace: HouseWorkspaceKey,
  action: WorkspaceActionKey,
) {
  return hasHouseWorkspaceAccess(role, workspace, action);
}

export function getResolvedAccess(role: AdminRole | null | undefined) {
  return resolveRoleAccess(role);
}
