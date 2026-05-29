import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseSpecialist, SpecialistIdAndLock } from "../types";
import {
  getSpecialist,
  HOUSE_SPECIALIST_ENTITY_TYPE,
  publicSpecialistsPaths,
  readIdAndLock,
  specialistHistoryMetadata,
} from "./shared";

export const publishCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SpecialistIdAndLock;
    const beforeResult = await getSpecialist(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_specialists")
      .update({
        lifecycle_status: "published",
        published_at: before.published_at ?? now,
        archived_at: null,
        updated_at: now,
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const specialist = data as HouseSpecialist;

    return ok({
      data: specialist,
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: specialist.id,
        action: "published",
        description: `Опубліковано спеціаліста «${specialist.title}».`,
        beforeSnapshot: before,
        afterSnapshot: specialist,
        metadata: specialistHistoryMetadata({
          category: specialist.category,
        }),
      },
      tasks: {
        complete: {
          entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
          entityId: specialist.id,
        },
      },
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
