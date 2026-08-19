"use server";

import { randomBytes } from "node:crypto";

import {
  resolveDiiaProvider,
} from "@/src/modules/diia/provider";
import {
  withResidentSession,
  ResidentSessionError,
} from "@/src/modules/houses/resident/withResidentSession";
import {
  cancelPendingOnlineBallot,
  createPendingOnlineBallot,
  type OnlineVoteAnswer,
  type OnlineVoteChoice,
} from "@/src/modules/houses/resident/onlineVotingRepository";
import {
  rateLimitPolicies,
} from "@/src/shared/security/rateLimitPolicies";

const VALID_CHOICES =
  new Set<OnlineVoteChoice>([
    "for",
    "against",
    "abstained",
  ]);

export type InitOnlineBallotInput = {
  slug: string;
  meetingId: string;
  apartmentId: string;
  ownedAreaM2: number;
  answers: OnlineVoteAnswer[];
};

export type InitOnlineBallotResult =
  | {
      ok: true;
      ballotId: string;
      challengeExpiresAt: string;
      redirectUrl?: string;
      deepLink?: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      retryAfterSeconds?: number;
    };

function normalizeId(value: string) {
  return value.trim();
}

function validateInput(
  input: InitOnlineBallotInput,
): string | null {
  if (
    !normalizeId(input.slug) ||
    !normalizeId(input.meetingId) ||
    !normalizeId(input.apartmentId)
  ) {
    return "Не вдалося визначити збори або квартиру.";
  }

  if (
    !Number.isFinite(input.ownedAreaM2) ||
    input.ownedAreaM2 <= 0
  ) {
    return "Вкажіть коректну площу вашої частки.";
  }

  if (
    !Array.isArray(input.answers) ||
    input.answers.length === 0
  ) {
    return "Дайте відповідь на всі питання.";
  }

  const seen = new Set<string>();

  for (const answer of input.answers) {
    const questionId =
      normalizeId(answer.questionId);

    if (
      !questionId ||
      !VALID_CHOICES.has(answer.choice) ||
      seen.has(questionId)
    ) {
      return "Відповіді на питання заповнені некоректно.";
    }

    seen.add(questionId);
  }

  return null;
}

function residentErrorResult(
  error: ResidentSessionError,
): InitOnlineBallotResult {
  return {
    ok: false,
    code: error.code,
    message: error.message,
    ...(error.retryAfterSeconds !== null
      ? {
          retryAfterSeconds:
            error.retryAfterSeconds,
        }
      : {}),
  };
}

function dbErrorMessage(code: string) {
  switch (code) {
    case "MEETING_NOT_ACTIVE_ONLINE":
      return "Онлайн-голосування для цих зборів зараз недоступне.";

    case "APARTMENT_INVALID":
      return "Квартиру не знайдено в цьому будинку.";

    case "APARTMENT_AREA_MISSING":
      return "Для квартири не заповнена площа. Зверніться до керуючого.";

    case "OWNED_AREA_INVALID":
      return "Вкажіть коректну площу вашої частки.";

    case "OWNED_AREA_EXCEEDS_APARTMENT":
      return "Площа частки не може перевищувати площу квартири.";

    case "APARTMENT_AREA_SOFT_RESERVED":
      return "Заявлена площа перевищує доступний залишок квартири. Можливо, інший співвласник уже голосує.";

    case "ANSWERS_INCOMPLETE":
    case "ANSWERS_DUPLICATE_OR_MISSING":
    case "ANSWERS_INVALID":
    case "QUESTION_SCOPE_INVALID":
      return "Дайте коректну відповідь на кожне питання зборів.";

    default:
      return "Не вдалося розпочати онлайн-голосування.";
  }
}

export async function initOnlineBallot(
  input: InitOnlineBallotInput,
): Promise<InitOnlineBallotResult> {
  const validationMessage = validateInput(input);

  if (validationMessage) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: validationMessage,
    };
  }

  const providerResolution =
    resolveDiiaProvider();

  if (
    !providerResolution.provider ||
    !providerResolution.config.enabled
  ) {
    return {
      ok: false,
      code: "ONLINE_VOTING_UNAVAILABLE",
      message:
        "Онлайн-голосування тимчасово недоступне.",
    };
  }

  const provider = providerResolution.provider;

  try {
    return await withResidentSession(
      {
        slug: input.slug,
        rateLimitPolicy:
          rateLimitPolicies.residentVoteInit,
      },
      async ({ houseId, slug }) => {
        const challenge =
          randomBytes(32).toString("base64url");

        const dbResult =
          await createPendingOnlineBallot({
            houseId,
            meetingId:
              normalizeId(input.meetingId),
            apartmentId:
              normalizeId(input.apartmentId),
            ownedAreaM2:
              input.ownedAreaM2,
            answers: input.answers.map(
              (answer) => ({
                questionId:
                  normalizeId(
                    answer.questionId,
                  ),
                choice: answer.choice,
              }),
            ),
            challenge,
            provider:
              provider.name,
          });

        if (!dbResult.ok) {
          return {
            ok: false,
            code: dbResult.code,
            message:
              dbErrorMessage(dbResult.code),
          };
        }

        try {
          const auth =
            await provider.initAuthRequest(
              challenge,
              {
                ballotId: dbResult.ballotId,
                meetingId:
                  normalizeId(
                    input.meetingId,
                  ),
                slug,
              },
            );

          return {
            ok: true,
            ballotId: dbResult.ballotId,
            challengeExpiresAt:
              dbResult.challengeExpiresAt,
            ...("redirectUrl" in auth &&
            typeof auth.redirectUrl ===
              "string"
              ? {
                  redirectUrl:
                    auth.redirectUrl,
                }
              : {}),
            ...("deepLink" in auth &&
            typeof auth.deepLink === "string"
              ? {
                  deepLink: auth.deepLink,
                }
              : {}),
          };
        } catch {
          await cancelPendingOnlineBallot(
            dbResult.ballotId,
            "AUTH_INIT_FAILED",
          );

          return {
            ok: false,
            code: "DIIA_AUTH_INIT_FAILED",
            message:
              "Не вдалося розпочати підтвердження через Дію. Спробуйте ще раз.",
          };
        }
      },
    );
  } catch (error) {
    if (error instanceof ResidentSessionError) {
      return residentErrorResult(error);
    }

    console.error(
      "Online ballot initialization failed",
      {
        meetingId: input.meetingId,
        code: "UNEXPECTED_INIT_FAILURE",
      },
    );

    return {
      ok: false,
      code: "ONLINE_BALLOT_INIT_FAILED",
      message:
        "Не вдалося розпочати онлайн-голосування.",
    };
  }
}
