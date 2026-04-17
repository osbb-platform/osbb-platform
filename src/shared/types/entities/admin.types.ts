import type { AdminRole } from "@/src/shared/constants/roles/roles.constants";

export type MembershipStatus =
  | "invited"
  | "active"
  | "inactive"
  | "archived";

export type CurrentAdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AdminRole | null;
  status: MembershipStatus | null;
  jobTitle: string | null;
  canManageEmployees: boolean;
};
