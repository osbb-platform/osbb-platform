import { err, ok, type Result } from "../../../types/result";
import type { BoardMemberRoleStatus } from "../types";

export const validRoleStatuses: BoardMemberRoleStatus[] = [
  "chairman",
  "vice_chairman",
  "member",
  "revision_commission",
];

export const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function validateRoleStatus(value: unknown): Result<BoardMemberRoleStatus> {
  if (validRoleStatuses.includes(value as BoardMemberRoleStatus)) {
    return ok(value as BoardMemberRoleStatus);
  }

  return err("Невірний тип ролі правління.", "VALIDATION_FAILED");
}

export function getRoleLabel(status: BoardMemberRoleStatus) {
  switch (status) {
    case "chairman":
      return "Голова правління";
    case "vice_chairman":
      return "Заступник голови правління";
    case "member":
      return "Член правління";
    case "revision_commission":
      return "Ревізійна комісія";
    default:
      return "Учасник правління";
  }
}
