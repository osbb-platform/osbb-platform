export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
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
  return role === ROLES.MANAGER;
}

export function getRoleLabel(role: string | null | undefined) {
  if (role === ROLES.SUPERADMIN) return "Superadmin";
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.MANAGER) return "Manager";
  return "Без роли";
}
