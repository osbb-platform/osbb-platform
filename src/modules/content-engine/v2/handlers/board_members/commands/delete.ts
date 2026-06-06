import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { DeleteBoardMemberPayload, HouseBoardMember } from "../types";

export const deleteCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<DeleteBoardMemberPayload>;

    if (!payload.id) {
      return err("Не передано ID представника правління.", "VALIDATION_FAILED");
    }

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію представника правління.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as DeleteBoardMemberPayload;

    const { data: deleted, error } = await ctx.supabase
      .from("house_board_members")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!deleted) {
      return err("Представника правління не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const member = deleted as HouseBoardMember;

    return ok({
      data: member,
      history: {
        entityType: "house_board_member",
        entityId: member.id,
        action: "deleted",
        description: `Видалено представника правління «${member.name}».`,
        beforeSnapshot: member,
        metadata: {
          subSectionKey: "board",
          roleStatus: member.role_status,
        },
      },
    });
  },
};
