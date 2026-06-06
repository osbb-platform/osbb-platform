export type BoardMemberRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";

export type HouseBoardMember = {
  id: string;
  house_id: string;
  role_status: BoardMemberRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  office_hours: string;
  description: string;
  sort_order: number;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

export type CreateBoardMemberPayload = {
  roleStatus: BoardMemberRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
  sortOrder?: number;
};

export type UpdateBoardMemberPayload = CreateBoardMemberPayload & {
  id: string;
  lockVersion: number;
};

export type DeleteBoardMemberPayload = {
  id: string;
  lockVersion: number;
};

export type ReorderBoardMembersPayload = {
  items: Array<{
    id: string;
    sortOrder: number;
  }>;
};
