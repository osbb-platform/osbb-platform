import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseBoardMember, UpdateBoardMemberPayload } from "../types";
import { getRoleLabel, normalizeText, validateRoleStatus } from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<UpdateBoardMemberPayload>;

    if (!payload.id) {
      return err("Не передано ID представника правління.", "VALIDATION_FAILED");
    }

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію представника правління.", "VALIDATION_FAILED");
    }

    const roleStatus = validateRoleStatus(payload.roleStatus);
    if (!roleStatus.ok) return roleStatus;

    if (!payload.name?.trim()) {
      return err("Заповніть імʼя представника правління.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateBoardMemberPayload;
    const roleStatus = validateRoleStatus(payload.roleStatus);
    if (!roleStatus.ok) return roleStatus;

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_board_members")
      .select("*")
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .maybeSingle();

    if (existingError) {
      return err(existingError.message, "INTERNAL");
    }

    if (!existing) {
      return err("Представника правління не знайдено.", "NOT_FOUND");
    }

    const current = existing as HouseBoardMember;
    const now = new Date().toISOString();

    const { data: updated, error } = await ctx.supabase
      .from("house_board_members")
      .update({
        role_status: roleStatus.data,
        name: normalizeText(payload.name),
        role: normalizeText(payload.role) || getRoleLabel(roleStatus.data),
        phone: normalizeText(payload.phone),
        email: normalizeText(payload.email),
        office_hours: normalizeText(payload.officeHours),
        description: normalizeText(payload.description),
        sort_order: typeof payload.sortOrder === "number" ? payload.sortOrder : current.sort_order,
        lock_version: payload.lockVersion + 1,
        updated_at: now,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return err(
          "Для цього будинку вже є представник з такою унікальною роллю.",
          "VALIDATION_FAILED",
        );
      }

      return err(error.message, "INTERNAL");
    }

    if (!updated) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const member = updated as HouseBoardMember;

    return ok({
      data: member,
      history: {
        entityType: "house_board_member",
        entityId: member.id,
        action: "updated",
        description: `Оновлено представника правління «${member.name}».`,
        beforeSnapshot: current,
        afterSnapshot: member,
        metadata: {
          subSectionKey: "board",
          roleStatus: member.role_status,
        },
      },
    });
  },
};
