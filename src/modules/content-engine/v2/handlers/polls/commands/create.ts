import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreatePollPayload, HousePoll } from "../types";
import {
  HOUSE_POLL_ENTITY_TYPE,
  getPollSnapshot,
  normalizeIdentityMode,
  normalizePollQuestions,
  normalizeResultsVisibility,
  normalizeText,
  pollTaskTitle,
  pollsHistoryMetadata,
  publicPollPaths,
  replacePollQuestions,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreatePollPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву опитування.", "VALIDATION_FAILED");
    }

    const questionsResult = normalizePollQuestions(payload.questions);
    if (!questionsResult.ok) return questionsResult;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreatePollPayload;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_polls")
      .insert({
        house_id: ctx.house.id,
        title: normalizeText(payload.title),
        description: normalizeText(payload.description),
        identity_mode: normalizeIdentityMode(payload.identityMode),
        results_visibility: normalizeResultsVisibility(payload.resultsVisibility),
        poll_status: "idle",
        lifecycle_status: "draft",
        lock_version: 1,
        created_at: now,
        updated_at: now,
        published_at: null,
        archived_at: null,
        created_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(error?.message ?? "Не вдалося створити опитування.", "INTERNAL");
    }

    const poll = data as HousePoll;
    const replaceResult = await replacePollQuestions(ctx, {
      pollId: poll.id,
      questions: payload.questions,
    });

    if (!replaceResult.ok) {
      await ctx.supabase
        .from("house_polls")
        .delete()
        .eq("id", poll.id)
        .eq("house_id", ctx.house.id);

      return replaceResult;
    }

    const snapshotResult = await getPollSnapshot(ctx, poll.id);
    if (!snapshotResult.ok) return snapshotResult;

    return ok({
      data: snapshotResult.data,
      history: {
        entityType: HOUSE_POLL_ENTITY_TYPE,
        entityId: poll.id,
        action: "created",
        description: `Створено опитування «${poll.title}».`,
        afterSnapshot: snapshotResult.data,
        metadata: pollsHistoryMetadata({
          identityMode: poll.identity_mode,
          resultsVisibility: poll.results_visibility,
        }),
      },
      tasks: {
        ensure: {
          entityType: HOUSE_POLL_ENTITY_TYPE,
          entityId: poll.id,
          title: pollTaskTitle(poll),
        },
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
