import { ROLES, type AdminRole } from "@/src/shared/constants/roles/roles.constants";
import type {
  CmsTopLevelSectionKey,
  HouseWorkspaceKey,
  RbacRoleDefinition,
  WorkspaceActionKey,
} from "@/src/shared/permissions/rbac.types";

const ALL_TOP_LEVEL_KEYS: CmsTopLevelSectionKey[] = [
  "dashboard",
  "districts",
  "houses",
  "apartments",
  "history",
  "employees",
  "companyPages",
  "profile",
];

const ALL_WORKSPACE_KEYS: HouseWorkspaceKey[] = [
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

const ALL_WORKSPACE_ACTIONS: WorkspaceActionKey[] = [
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

function allowAllTopLevel() {
  return Object.fromEntries(
    ALL_TOP_LEVEL_KEYS.map((key) => [key, true]),
  ) as Record<CmsTopLevelSectionKey, true>;
}

function denyAllWorkspaces() {
  return Object.fromEntries(
    ALL_WORKSPACE_KEYS.map((workspace) => [
      workspace,
      Object.fromEntries(
        ALL_WORKSPACE_ACTIONS.map((action) => [action, false]),
      ),
    ]),
  ) as Record<HouseWorkspaceKey, Record<WorkspaceActionKey, boolean>>;
}

const managerWorkspaces = denyAllWorkspaces();

managerWorkspaces.announcements = {
  view: true,
  create: true,
  edit: true,
  saveDraft: true,
  changeWorkflowStatus: true,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.board = {
  view: true,
  create: false,
  edit: false,
  saveDraft: false,
  changeWorkflowStatus: false,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.information = {
  view: true,
  create: true,
  edit: true,
  saveDraft: true,
  changeWorkflowStatus: false,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.reports = {
  view: true,
  create: false,
  edit: false,
  saveDraft: false,
  changeWorkflowStatus: false,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.plan = {
  view: true,
  create: true,
  edit: true,
  saveDraft: true,
  changeWorkflowStatus: true,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.meetings = {
  view: true,
  create: true,
  edit: true,
  saveDraft: true,
  changeWorkflowStatus: true,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.requisites = {
  view: true,
  create: false,
  edit: false,
  saveDraft: false,
  changeWorkflowStatus: false,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.specialists = {
  view: true,
  create: true,
  edit: true,
  saveDraft: true,
  changeWorkflowStatus: false,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

managerWorkspaces.debtors = {
  view: true,
  create: true,
  edit: true,
  saveDraft: true,
  changeWorkflowStatus: false,
  publish: false,
  confirm: false,
  archive: false,
  restore: false,
  delete: false,
};

export const RBAC_ROLE_CONFIG: Record<AdminRole, RbacRoleDefinition> = {
  [ROLES.MANAGER]: {
    topLevel: {
      dashboard: true,
      districts: false,
      houses: true,
      apartments: true,
      history: true,
      employees: false,
      companyPages: false,
      profile: true,
    },
    housesRegistry: {
      view: true,
      create: false,
      edit: false,
      archive: false,
      restore: false,
      delete: false,
      openCms: true,
      openPublicSite: true,
      changeAccessCode: false,
      manageCredentials: false,
    },
    apartmentsRegistry: {
      view: true,
      createManual: false,
      importReplace: false,
      archiveOne: false,
      archiveAll: false,
      restore: false,
      edit: false,
      export: false,
    },
    history: {
      viewCms: true,
      viewIncoming: true,
      export: false,
      clear: false,
    },
    employees: {
      view: true,
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
      view: true,
      editOwnProfile: true,
      viewSystemAccessMap: false,
      viewHouseAccessCodes: false,
      viewAdminRegistryInfo: false,
    },
    houseShell: {
      openWorkspace: true,
      openPublicSite: true,
      viewMeta: true,
      editMeta: false,
      changeDistrict: false,
      editDescriptions: false,
      editRequisites: false,
      changeAccessCode: false,
      archiveFromDetail: false,
      restoreFromDetail: false,
    },
    houseWorkspaces: managerWorkspaces,
    security: {
      viewPasswordsInProfile: false,
      viewHouseAccessCodes: false,
      changeHouseAccessCodes: false,
      inviteAdmins: false,
      mutateSuperadmin: false,
    },
  },

  [ROLES.ADMIN]: {
    inherits: [ROLES.MANAGER],
    topLevel: Object.fromEntries(
      ALL_TOP_LEVEL_KEYS.map((key) => [key, true]),
    ),
    housesRegistry: {
      create: true,
      edit: true,
      archive: true,
      restore: true,
      delete: true,
      changeAccessCode: false,
      manageCredentials: false,
    },
    apartmentsRegistry: {
      createManual: true,
      importReplace: true,
      archiveOne: true,
      archiveAll: true,
      restore: true,
      edit: true,
      export: true,
    },
    history: {
      export: false,
      clear: false,
    },
    employees: {
      createManager: true,
      createAdmin: false,
      updateRole: true,
      resendInvite: true,
      deactivate: true,
      delete: true,
      editSuperadmin: false,
      deleteSuperadmin: false,
      inviteAdmin: false,
    },
    companyPages: {
      view: true,
      create: true,
      edit: true,
      publish: true,
      archive: true,
    },
    profile: {
      editOwnProfile: true,
      viewSystemAccessMap: true,
      viewHouseAccessCodes: true,
      viewAdminRegistryInfo: true,
    },
    houseShell: {
      editMeta: true,
      changeDistrict: true,
      editDescriptions: true,
      editRequisites: true,
      archiveFromDetail: true,
      restoreFromDetail: true,
      changeAccessCode: false,
    },
    houseWorkspaces: {
      announcements: {
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      board: {
        edit: true,
        saveDraft: true,
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      information: {
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      reports: {
        create: true,
        edit: true,
        saveDraft: true,
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      plan: {
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      meetings: {
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      requisites: {
        edit: true,
        saveDraft: true,
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      specialists: {
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
      debtors: {
        publish: true,
        confirm: true,
        archive: true,
        restore: true,
        delete: true,
      },
    },
    security: {
      viewHouseAccessCodes: true,
      viewPasswordsInProfile: false,
      changeHouseAccessCodes: false,
      inviteAdmins: false,
      mutateSuperadmin: false,
    },
  },

  [ROLES.SUPERADMIN]: {
    inherits: [ROLES.ADMIN],
    topLevel: allowAllTopLevel(),
    housesRegistry: {
      changeAccessCode: true,
      manageCredentials: true,
    },
    apartmentsRegistry: {
      view: true,
      createManual: true,
      importReplace: true,
      archiveOne: true,
      archiveAll: true,
      restore: true,
      edit: true,
      export: true,
    },
    history: {
      viewCms: true,
      viewIncoming: true,
      export: true,
      clear: true,
    },
    employees: {
      createManager: true,
      createAdmin: true,
      updateRole: true,
      resendInvite: true,
      deactivate: true,
      delete: true,
      editSuperadmin: true,
      deleteSuperadmin: false,
      inviteAdmin: true,
    },
    companyPages: {
      view: true,
      create: true,
      edit: true,
      publish: true,
      archive: true,
    },
    profile: {
      view: true,
      editOwnProfile: true,
      viewSystemAccessMap: true,
      viewHouseAccessCodes: true,
      viewAdminRegistryInfo: true,
    },
    houseShell: {
      openWorkspace: true,
      openPublicSite: true,
      viewMeta: true,
      editMeta: true,
      changeDistrict: true,
      editDescriptions: true,
      editRequisites: true,
      changeAccessCode: true,
      archiveFromDetail: true,
      restoreFromDetail: true,
    },
    houseWorkspaces: {},
    security: {
      viewPasswordsInProfile: false,
      viewHouseAccessCodes: true,
      changeHouseAccessCodes: true,
      inviteAdmins: true,
      mutateSuperadmin: true,
    },
  },
};
