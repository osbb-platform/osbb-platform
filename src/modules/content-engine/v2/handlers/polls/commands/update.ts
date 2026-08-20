import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePoll, UpdatePollPayload } from "../types";
import {
  getPollSnapshot,
  HOUSE_POLL_ENTITY_TYPE,
  normalizeIdentityMode,
  normalizeResultsVisibility,
  normalizeText,
  pollHasParticipation,
  pollsHistoryMetadata,
  publicPollPaths,
  readIdAndLock,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdatePollPayload>;
    if (!payload.title?.trim()) {
      return err("Заповніть назву опитування.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdatePollPayload;
    const beforeResult = await getPollSnapshot(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (before.poll.lifecycle_status === "archived") {
      return err(
        "Архівне опитування спочатку потрібно відновити.",
        "VALIDATION_FAILED",
      );
    }

    const identityMode = normalizeIdentityMode(
      payload.identityMode,
      before.poll.identity_mode,
    );
    const resultsVisibility = normalizeResultsVisibility(
      payload.resultsVisibility,
      before.poll.results_visibility,
    );

    const settingsChanged =
      identityMode !== before.poll.identity_mode ||
      resultsVisibility !== before.poll.results_visibility;

    if (settingsChanged) {
      const participationResult = await pollHasParticipation(ctx, payload.id);
      if (!participationResult.ok) return participationResult;

      if (participationResult.data) {
        return err(
          "Режим ідентифікації та видимість результатів не можна змінювати після першої відповіді.",
          "VALIDATION_FAILED",
        );
      }
    }

    const { data, error } = await ctx.supabase
      .from("house_polls")
      .update({
        title: normalizeText(payload.title),
        description: normalizeText(payload.description),
        identity_mode: identityMode,
        results_visibility: resultsVisibility,
        updated_at: new Date().toISOString(),
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) return err(error.message, "INTERNAL");
    if (!data) return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");

    const poll = data as HousePoll;

    return ok({
      data: poll,
      history: {
        entityType: HOUSE_POLL_ENTITY_TYPE,
        entityId: poll.id,
        action: "updated",
        description: `Оновлено опитування «${poll.title}».`,
        beforeSnapshot: before,
        afterSnapshot: poll,
        metadata: pollsHistoryMetadata({
          identityMode: poll.identity_mode,
          resultsVisibility: poll.results_visibility,
        }),
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
