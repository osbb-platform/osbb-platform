"use server";

import {
  ResidentSessionError,
  withResidentSession,
} from "@/src/modules/houses/resident/withResidentSession";
import { getPollResults } from "@/src/modules/houses/services/getPollResults";
import type { PollResultsReadModel } from "@/src/modules/houses/services/pollResultsModel";

export type GetResidentPollResultsResult =
  | {
      ok: true;
      data: PollResultsReadModel | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function getResidentPollResults(input: {
  slug: string;
  pollId: string;
  apartmentId: string;
}): Promise<GetResidentPollResultsResult> {
  const slug = input.slug.trim();
  const pollId = input.pollId.trim();
  const apartmentId = input.apartmentId.trim();

  if (!slug || !pollId || !apartmentId) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message:
        "Не вдалося визначити опитування або квартиру.",
    };
  }

  try {
    return await withResidentSession(
      { slug },
      async ({ houseId }) => ({
        ok: true as const,
        data: await getPollResults({
          houseId,
          pollId,
          viewer: {
            kind: "resident",
            apartmentId,
          },
        }),
      }),
    );
  } catch (error) {
    if (error instanceof ResidentSessionError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    console.error(
      "P07 resident results read failed",
      {
        pollId,
        code: "UNEXPECTED_RESULTS_FAILURE",
      },
    );

    return {
      ok: false,
      code: "POLL_RESULTS_FAILED",
      message:
        "Не вдалося завантажити результати опитування.",
    };
  }
}
