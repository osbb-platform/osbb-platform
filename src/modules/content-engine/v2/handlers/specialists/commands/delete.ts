import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { DeleteSpecialistPayload, HouseSpecialist } from "../types";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  publicSpecialistsPaths,
  readIdAndLock,
  specialistHistoryMetadata,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as DeleteSpecialistPayload;

    const { data, error } = await ctx.supabase
      .from("house_specialists")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Спеціаліста не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const specialist = data as HouseSpecialist;

    return ok({
      data: specialist,
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: specialist.id,
        action: "deleted",
        description: `Видалено спеціаліста «${specialist.title}».`,
        beforeSnapshot: specialist,
        metadata: specialistHistoryMetadata({
          category: specialist.category,
        }),
      },
      tasks: {
        delete: {
          entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
          entityId: specialist.id,
        },
      },
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
