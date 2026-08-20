import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { ReplacePollQuestionsPayload } from "../types";
import {
  getPollSnapshot,
  HOUSE_POLL_ENTITY_TYPE,
  normalizePollQuestions,
  pollHasParticipation,
  pollsHistoryMetadata,
  publicPollPaths,
  readIdAndLock,
  replacePollQuestions,
} from "./shared";

export const replaceQuestionsCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<ReplacePollQuestionsPayload>;
    const questionsResult = normalizePollQuestions(payload.questions);
    if (!questionsResult.ok) return questionsResult;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReplacePollQuestionsPayload;
    const beforeResult = await getPollSnapshot(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (
      before.poll.lifecycle_status !== "draft" ||
      before.poll.poll_status !== "idle"
    ) {
      return err(
        "Питання можна змінювати лише в чернетці опитування.",
        "VALIDATION_FAILED",
      );
    }

    const participationResult = await pollHasParticipation(ctx, payload.id);
    if (!participationResult.ok) return participationResult;

    if (participationResult.data) {
      return err(
        "Питання не можна змінювати після першої відповіді.",
        "VALIDATION_FAILED",
      );
    }

    const parentUpdate = await ctx.supabase
      .from("house_polls")
      .update({
        updated_at: new Date().toISOString(),
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .eq("lifecycle_status", "draft")
      .eq("poll_status", "idle")
      .select("*")
      .maybeSingle();

    if (parentUpdate.error) return err(parentUpdate.error.message, "INTERNAL");

    if (!parentUpdate.data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const replaceResult = await replacePollQuestions(ctx, {
      pollId: payload.id,
      questions: payload.questions,
    });
    if (!replaceResult.ok) return replaceResult;

    const afterResult = await getPollSnapshot(ctx, payload.id);
    if (!afterResult.ok) return afterResult;

    return ok({
      data: afterResult.data,
      history: {
        entityType: HOUSE_POLL_ENTITY_TYPE,
        entityId: payload.id,
        action: "questions.replaced",
        description: `Оновлено питання опитування «${before.poll.title}».`,
        beforeSnapshot: before,
        afterSnapshot: afterResult.data,
        metadata: pollsHistoryMetadata({
          questionsCount: afterResult.data.questions.length,
        }),
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
