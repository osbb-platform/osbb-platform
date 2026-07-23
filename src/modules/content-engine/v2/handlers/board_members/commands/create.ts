import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateBoardMemberPayload, HouseBoardMember } from "../types";
import { getRoleLabel, normalizeText, validateRoleStatus } from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateBoardMemberPayload>;

    const roleStatus = validateRoleStatus(payload.roleStatus);
    if (!roleStatus.ok) return roleStatus;

    if (!payload.name?.trim()) {
      return err("Заповніть імʼя представника правління.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateBoardMemberPayload;
    const roleStatus = validateRoleStatus(payload.roleStatus);
    if (!roleStatus.ok) return roleStatus;

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_board_members")
      .insert({
        house_id: ctx.house.id,
        role_status: roleStatus.data,
        name: normalizeText(payload.name),
        role: normalizeText(payload.role) || getRoleLabel(roleStatus.data),
        phone: normalizeText(payload.phone),
        email: normalizeText(payload.email),
        office_hours: normalizeText(payload.officeHours),
        description: normalizeText(payload.description),
        sort_order: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
        lock_version: 1,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        const roleLabel = getRoleLabel(roleStatus.data);

        return err(
          `Для цього будинку вже призначено роль "${roleLabel}". Відредагуйте або видаліть поточну картку перед створенням нової.`,
          "VALIDATION_FAILED",
        );
      }

      return err(error?.message ?? "Не вдалося створити представника правління.", "INTERNAL");
    }

    const member = data as HouseBoardMember;

    return ok({
      data: member,
      history: {
        entityType: "house_board_member",
        entityId: member.id,
        action: "created",
        description: `Створено представника правління «${member.name}».`,
        beforeSnapshot: null,
        afterSnapshot: member,
        metadata: {
          subSectionKey: "board",
          roleStatus: member.role_status,
        },
      },
    });
  },
};
