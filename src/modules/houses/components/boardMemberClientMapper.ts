export type BoardMemberClientRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";

export type BoardMemberClientItem = {
  id: string;
  status: BoardMemberClientRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
  sortOrder: number;
  lockVersion: number;
};

type BoardMemberCommandResponse = {
  id?: unknown;
  house_id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  roleStatus?: unknown;
  role_status?: unknown;
  name?: unknown;
  role?: unknown;
  phone?: unknown;
  email?: unknown;
  officeHours?: unknown;
  office_hours?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  sort_order?: unknown;
  lockVersion?: unknown;
  lock_version?: unknown;
};

const validRoleStatuses = new Set<BoardMemberClientRoleStatus>([
  "chairman",
  "vice_chairman",
  "member",
  "revision_commission",
]);

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid board member response field: ${field}`);
  }

  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function requiredNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid board member response field: ${field}`);
  }

  return value;
}

export function mapBoardMemberCommandResponse(
  member: BoardMemberCommandResponse,
): BoardMemberClientItem {
  const rawStatus = member.roleStatus ?? member.role_status;

  if (
    typeof rawStatus !== "string" ||
    !validRoleStatuses.has(rawStatus as BoardMemberClientRoleStatus)
  ) {
    throw new Error("Invalid board member response field: role status");
  }

  return {
    id: requiredString(member.id, "id"),
    status: rawStatus as BoardMemberClientRoleStatus,
    name: requiredString(member.name, "name"),
    role: optionalString(member.role),
    phone: optionalString(member.phone),
    email: optionalString(member.email),
    officeHours: optionalString(member.officeHours ?? member.office_hours),
    description: optionalString(member.description),
    sortOrder: requiredNumber(member.sortOrder ?? member.sort_order, "sort order"),
    lockVersion: requiredNumber(member.lockVersion ?? member.lock_version, "lock version"),
  };
}
