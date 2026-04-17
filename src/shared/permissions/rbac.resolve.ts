import type { AdminRole } from "@/src/shared/constants/roles/roles.constants";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { RBAC_ROLE_CONFIG } from "@/src/shared/permissions/rbac.config";
import type {
  CmsTopLevelSectionKey,
  HouseWorkspaceKey,
  ResolvedRoleAccess,
  TopLevelAccessMap,
  WorkspaceActionKey,
} from "@/src/shared/permissions/rbac.types";

const TOP_LEVEL_KEYS: CmsTopLevelSectionKey[] = [
  "dashboard",
  "districts",
  "houses",
  "apartments",
  "history",
  "employees",
  "companyPages",
  "profile",
];

const WORKSPACE_KEYS: HouseWorkspaceKey[] = [
  "announcements",
  "board",
  "information",
  "reports",
  "plan",
  "meetings",
  "requisites",
  "specialists",
  "debtors",
];

const WORKSPACE_ACTIONS: WorkspaceActionKey[] = [
  "view",
  "create",
  "edit",
  "saveDraft",
  "changeWorkflowStatus",
  "publish",
  "confirm",
  "archive",
  "restore",
  "delete",
];

function createDefaultTopLevel(): TopLevelAccessMap {
  return Object.fromEntries(TOP_LEVEL_KEYS.map((key) => [key, false])) as TopLevelAccessMap;
}

function createDefaultWorkspaceAccess() {
  return Object.fromEntries(
    WORKSPACE_KEYS.map((workspace) => [
      workspace,
      Object.fromEntries(
        WORKSPACE_ACTIONS.map((action) => [action, false]),
      ),
    ]),
  ) as ResolvedRoleAccess["houseWorkspaces"];
}

function createEmptyResolved(role: AdminRole): ResolvedRoleAccess {
  return {
    role,
    topLevel: createDefaultTopLevel(),
    housesRegistry: {
      view: false,
      create: false,
      edit: false,
      archive: false,
      restore: false,
      delete: false,
      openCms: false,
      openPublicSite: false,
      changeAccessCode: false,
      manageCredentials: false,
    },
    apartmentsRegistry: {
      view: false,
      createManual: false,
      importReplace: false,
      archiveOne: false,
      archiveAll: false,
      restore: false,
      edit: false,
      export: false,
    },
    history: {
      viewCms: false,
      viewIncoming: false,
      export: false,
      clear: false,
    },
    employees: {
      view: false,
      createManager: false,
      createAdmin: false,
      updateRole: false,
      resendInvite: false,
      deactivate: false,
      delete: false,
      editSuperadmin: false,
      deleteSuperadmin: false,
      inviteAdmin: false,
    },
    companyPages: {
      view: false,
      create: false,
      edit: false,
      publish: false,
      archive: false,
    },
    profile: {
      view: false,
      editOwnProfile: false,
      viewSystemAccessMap: false,
      viewHouseAccessCodes: false,
      viewAdminRegistryInfo: false,
    },
    houseShell: {
      openWorkspace: false,
      openPublicSite: false,
      viewMeta: false,
      editMeta: false,
      changeDistrict: false,
      editDescriptions: false,
      editRequisites: false,
      changeAccessCode: false,
      archiveFromDetail: false,
      restoreFromDetail: false,
    },
    houseWorkspaces: createDefaultWorkspaceAccess(),
    security: {
      viewPasswordsInProfile: false,
      viewHouseAccessCodes: false,
      changeHouseAccessCodes: false,
      inviteAdmins: false,
      mutateSuperadmin: false,
    },
  };
}

function mergeResolvedAccess(
  target: ResolvedRoleAccess,
  source: Partial<ResolvedRoleAccess>,
) {
  if (source.topLevel) {
    Object.assign(target.topLevel, source.topLevel);
  }

  if (source.housesRegistry) {
    Object.assign(target.housesRegistry, source.housesRegistry);
  }

  if (source.apartmentsRegistry) {
    Object.assign(target.apartmentsRegistry, source.apartmentsRegistry);
  }

  if (source.history) {
    Object.assign(target.history, source.history);
  }

  if (source.employees) {
    Object.assign(target.employees, source.employees);
  }

  if (source.companyPages) {
    Object.assign(target.companyPages, source.companyPages);
  }

  if (source.profile) {
    Object.assign(target.profile, source.profile);
  }

  if (source.houseShell) {
    Object.assign(target.houseShell, source.houseShell);
  }

  if (source.security) {
    Object.assign(target.security, source.security);
  }

  if (source.houseWorkspaces) {
    for (const workspaceKey of WORKSPACE_KEYS) {
      const workspacePatch = source.houseWorkspaces[workspaceKey];
      if (workspacePatch) {
        Object.assign(target.houseWorkspaces[workspaceKey], workspacePatch);
      }
    }
  }
}

function buildResolvedRoleAccess(role: AdminRole): ResolvedRoleAccess {
  const resolved = createEmptyResolved(role);
  const config = RBAC_ROLE_CONFIG[role];

  for (const inheritedRole of config.inherits ?? []) {
    mergeResolvedAccess(resolved, buildResolvedRoleAccess(inheritedRole));
  }

  mergeResolvedAccess(resolved, {
    role,
    topLevel: config.topLevel,
    housesRegistry: config.housesRegistry,
    apartmentsRegistry: config.apartmentsRegistry,
    history: config.history,
    employees: config.employees,
    companyPages: config.companyPages,
    profile: config.profile,
    houseShell: config.houseShell,
    houseWorkspaces: config.houseWorkspaces as ResolvedRoleAccess["houseWorkspaces"],
    security: config.security,
  });

  return resolved;
}

export function resolveRoleAccess(role: AdminRole | null | undefined): ResolvedRoleAccess {
  const safeRole = role ?? ROLES.MANAGER;
  return buildResolvedRoleAccess(safeRole);
}

export function hasTopLevelAccess(
  role: AdminRole | null | undefined,
  section: CmsTopLevelSectionKey,
) {
  return resolveRoleAccess(role).topLevel[section];
}

export function hasHouseWorkspaceAccess(
  role: AdminRole | null | undefined,
  workspace: HouseWorkspaceKey,
  action: WorkspaceActionKey,
) {
  return resolveRoleAccess(role).houseWorkspaces[workspace][action];
}
