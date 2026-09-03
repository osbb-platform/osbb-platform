"use server";

import { ResidentSessionError, withResidentSession } from "@/src/modules/houses/resident/withResidentSession";
import { submitPollAnswersDb, type PollAnswerInput } from "@/src/modules/houses/resident/pollsRepository";
import { rateLimitPolicies } from "@/src/shared/security/rateLimitPolicies";

export type SubmitPollAnswersInput = { slug: string; pollId: string; apartmentId: string; answers: PollAnswerInput[] };
export type SubmitPollAnswersResult =
  | { ok: true; code: "SUBMITTED" }
  | { ok: false; code: string; message: string; retryAfterSeconds?: number };

function norm(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function dbMessage(code: string) {
  switch (code) {
    case "POLL_NOT_ACTIVE": return "Це опитування зараз недоступне для відповідей.";
    case "APARTMENT_INVALID": return "Квартиру не знайдено в цьому будинку.";
    case "APARTMENT_ALREADY_ANSWERED": return "Ця квартира вже відповіла на опитування.";
    case "ANSWERS_INCOMPLETE": return "Дайте відповідь на всі обов’язкові питання.";
    default: return "Перевірте відповіді на питання опитування.";
  }
}

export async function submitPollAnswers(input: SubmitPollAnswersInput): Promise<SubmitPollAnswersResult> {
  if (!norm(input.slug) || !norm(input.pollId) || !norm(input.apartmentId) || !Array.isArray(input.answers)) {
    return { ok: false, code: "VALIDATION_FAILED", message: "Не вдалося визначити опитування, квартиру або відповіді." };
  }

  try {
    return await withResidentSession(
      { slug: input.slug, rateLimitPolicy: rateLimitPolicies.pollSubmit },
      async ({ houseId }) => {
        const result = await submitPollAnswersDb({ houseId, pollId: norm(input.pollId), apartmentId: norm(input.apartmentId), answers: input.answers });
        if (!result.ok) return { ok: false, code: result.code, message: dbMessage(result.code) };
        return { ok: true, code: "SUBMITTED" as const };
      },
    );
  } catch (error) {
    if (error instanceof ResidentSessionError) {
      return { ok: false, code: error.code, message: error.message, ...(error.retryAfterSeconds !== null ? { retryAfterSeconds: error.retryAfterSeconds } : {}) };
    }
    console.error("P07 resident poll submit failed", {
      pollId: norm(input.pollId),
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Unknown resident poll submit failure",
    });
    return { ok: false, code: "POLL_SUBMIT_FAILED", message: "Не вдалося зберегти відповіді. Спробуйте ще раз." };
  }
}
