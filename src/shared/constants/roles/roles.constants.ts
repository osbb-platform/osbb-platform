export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  CONTENT_MANAGER: "content_manager",
} as const;

export type AdminRole = (typeof ROLES)[keyof typeof ROLES];

export function isAdminManagementRole(role: string | null | undefined) {
  return role === ROLES.SUPERADMIN || role === ROLES.ADMIN;
}

export function canManageEmployees(role: string | null | undefined) {
  return role === ROLES.SUPERADMIN || role === ROLES.ADMIN;
}

export function canApproveHouseContent(role: string | null | undefined) {
  return role === ROLES.SUPERADMIN || role === ROLES.ADMIN;
}

export function isManagerRole(role: string | null | undefined) {
  return role === ROLES.MANAGER || role === ROLES.CONTENT_MANAGER;
}

export function getRoleLabel(role: string | null | undefined) {
  if (role === ROLES.SUPERADMIN) return "Superadmin";
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.MANAGER) return "Manager";
  if (role === ROLES.CONTENT_MANAGER) return "Контент-менеджер";
  return "Без ролі";
}
