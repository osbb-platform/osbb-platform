import type { AdminRole } from "@/src/shared/constants/roles/roles.constants";

export type CmsTopLevelSectionKey =
  | "dashboard"
  | "districts"
  | "houses"
  | "apartments"
  | "history"
  | "employees"
  | "companyPages"
  | "profile";

export type HouseWorkspaceKey =
  | "announcements"
  | "board"
  | "information"
  | "reports"
  | "plan"
  | "meetings"
  | "requisites"
  | "specialists"
  | "debtors"
  | "foundingDocuments";

export type WorkspaceActionKey =
  | "view"
  | "create"
  | "edit"
  | "saveDraft"
  | "changeWorkflowStatus"
  | "publish"
  | "confirm"
  | "archive"
  | "restore"
  | "delete";

export type PermissionValue = boolean;

export type TopLevelAccessMap = Record<CmsTopLevelSectionKey, PermissionValue>;

export type HousesRegistryAccess = {
  view: PermissionValue;
  create: PermissionValue;
  edit: PermissionValue;
  archive: PermissionValue;
  restore: PermissionValue;
  delete: PermissionValue;
  openCms: PermissionValue;
  openPublicSite: PermissionValue;
  changeAccessCode: PermissionValue;
  manageCredentials: PermissionValue;
};

export type ApartmentsRegistryAccess = {
  view: PermissionValue;
  createManual: PermissionValue;
  importReplace: PermissionValue;
  archiveOne: PermissionValue;
  archiveAll: PermissionValue;
  restore: PermissionValue;
  edit: PermissionValue;
  export: PermissionValue;
};

export type HistoryAccess = {
  viewCms: PermissionValue;
  viewIncoming: PermissionValue;
  export: PermissionValue;
  clear: PermissionValue;
};

export type EmployeesAccess = {
  view: PermissionValue;
  createManager: PermissionValue;
  createAdmin: PermissionValue;
  updateRole: PermissionValue;
  resendInvite: PermissionValue;
  deactivate: PermissionValue;
  delete: PermissionValue;
  editSuperadmin: PermissionValue;
  deleteSuperadmin: PermissionValue;
  inviteAdmin: PermissionValue;
};

export type CompanyPagesAccess = {
  view: PermissionValue;
  create: PermissionValue;
  edit: PermissionValue;
  publish: PermissionValue;
  archive: PermissionValue;
};

export type ProfileAccess = {
  view: PermissionValue;
  editOwnProfile: PermissionValue;
  viewSystemAccessMap: PermissionValue;
  viewHouseAccessCodes: PermissionValue;
  viewAdminRegistryInfo: PermissionValue;
};

export type HouseShellAccess = {
  openWorkspace: PermissionValue;
  openPublicSite: PermissionValue;
  viewMeta: PermissionValue;
  editMeta: PermissionValue;
  changeDistrict: PermissionValue;
  editDescriptions: PermissionValue;
  editRequisites: PermissionValue;
  changeAccessCode: PermissionValue;
  archiveFromDetail: PermissionValue;
  restoreFromDetail: PermissionValue;
};

export type HouseWorkspaceAccess = Record<
  HouseWorkspaceKey,
  Record<WorkspaceActionKey, PermissionValue>
>;

export type SecurityAccess = {
  viewPasswordsInProfile: PermissionValue;
  viewHouseAccessCodes: PermissionValue;
  changeHouseAccessCodes: PermissionValue;
  inviteAdmins: PermissionValue;
  mutateSuperadmin: PermissionValue;
};

export type RbacRoleDefinition = {
  inherits?: AdminRole[];
  topLevel: Partial<TopLevelAccessMap>;
  housesRegistry: Partial<HousesRegistryAccess>;
  apartmentsRegistry: Partial<ApartmentsRegistryAccess>;
  history: Partial<HistoryAccess>;
  employees: Partial<EmployeesAccess>;
  companyPages: Partial<CompanyPagesAccess>;
  profile: Partial<ProfileAccess>;
  houseShell: Partial<HouseShellAccess>;
  houseWorkspaces: Partial<
    Record<HouseWorkspaceKey, Partial<Record<WorkspaceActionKey, PermissionValue>>>
  >;
  security: Partial<SecurityAccess>;
};

export type ResolvedRoleAccess = {
  role: AdminRole;
  topLevel: TopLevelAccessMap;
  housesRegistry: HousesRegistryAccess;
  apartmentsRegistry: ApartmentsRegistryAccess;
  history: HistoryAccess;
  employees: EmployeesAccess;
  companyPages: CompanyPagesAccess;
  profile: ProfileAccess;
  houseShell: HouseShellAccess;
  houseWorkspaces: HouseWorkspaceAccess;
  security: SecurityAccess;
};
