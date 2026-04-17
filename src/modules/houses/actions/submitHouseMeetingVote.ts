"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

type VoteState = {
  error: string | null;
  successMessage: string | null;
};

type VoteChoice = "for" | "against" | "abstained";

const initialState: VoteState = {
  error: null,
  successMessage: null,
};

export async function submitHouseMeetingVote(
  _: VoteState = initialState,
  formData: FormData,
): Promise<VoteState> {
  void _;
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const meetingId = String(formData.get("meetingId") ?? "").trim();
  const apartmentId = String(formData.get("apartmentId") ?? "").trim();
  const rawVotes = String(formData.get("votesPayload") ?? "").trim();

  if (!houseSlug || !houseId || !sectionId || !meetingId || !apartmentId || !rawVotes) {
    return {
      error: "Не удалось отправить голос. Проверьте квартиру и ответы.",
      successMessage: null,
    };
  }

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(getHouseAccessCookieName(houseSlug))?.value ?? "";

  const hasAccess = sessionToken
    ? await validateHouseSession({
        slug: houseSlug,
        sessionToken,
      })
    : false;

  if (!hasAccess) {
    return {
      error: "Сессия доступа к дому не подтверждена.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: section, error: sectionError } = await supabase
    .from("house_sections")
    .select("id, content")
    .eq("id", sectionId)
    .maybeSingle();

  if (sectionError || !section) {
    return {
      error: "Не удалось загрузить собрание.",
      successMessage: null,
    };
  }

  const content =
    section.content && typeof section.content === "object"
      ? (section.content as Record<string, unknown>)
      : {};

  const items = Array.isArray(content.items)
    ? [...(content.items as Record<string, unknown>[])]
    : [];

  let submitted = false;

  let votesMap: Record<string, VoteChoice>;

  try {
    votesMap = JSON.parse(rawVotes) as Record<string, VoteChoice>;
  } catch {
    return {
      error: "Не удалось обработать результаты голосования.",
      successMessage: null,
    };
  }

  const nextItems = items.map((item) => {
    if (String(item.id ?? "") !== meetingId) {
      return item;
    }

    const votedApartmentIds = Array.isArray(item.votedApartmentIds)
      ? [...(item.votedApartmentIds as string[])]
      : [];

    if (votedApartmentIds.includes(apartmentId)) {
      return item;
    }

    const questionIds = Array.isArray(item.questions)
      ? item.questions.map((question) => String(question.id ?? ""))
      : [];

    const hasMissingVotes =
      questionIds.length === 0 ||
      questionIds.some((questionId) => {
        const vote = votesMap[questionId];
        return (
          vote !== "for" &&
          vote !== "against" &&
          vote !== "abstained"
        );
      });

    if (hasMissingVotes) {
      return item;
    }

    submitted = true;

    const nextQuestions = Array.isArray(item.questions)
      ? item.questions.map((question) => {
          const qid = String(question.id ?? "");
          const vote = votesMap[qid];

          const votesFor = Number(question.votesFor ?? 0);
          const votesAgainst = Number(question.votesAgainst ?? 0);
          const votesAbstained = Number(question.votesAbstained ?? 0);
          const total = Number(question.totalApartmentsVoted ?? 0) + 1;

          return {
            ...question,
            votesFor: vote === "for" ? votesFor + 1 : votesFor,
            votesAgainst:
              vote === "against" ? votesAgainst + 1 : votesAgainst,
            votesAbstained:
              vote === "abstained"
                ? votesAbstained + 1
                : votesAbstained,
            totalApartmentsVoted: total,
          };
        })
      : [];

    return {
      ...item,
      questions: nextQuestions,
      votedApartmentIds: [...votedApartmentIds, apartmentId],
      updatedAt: new Date().toISOString(),
    };
  });

  if (!submitted) {
    return {
      error: "Эта квартира уже голосовала по данному собранию или не были выбраны ответы по всем вопросам.",
      successMessage: null,
    };
  }

  const { error: updateError } = await supabase
    .from("house_sections")
    .update({
      content: {
        ...content,
        items: nextItems,
        updatedAt: new Date().toISOString(),
      },
    })
    .eq("id", sectionId);

  if (updateError) {
    return {
      error: `Не удалось сохранить голос: ${updateError.message}`,
      successMessage: null,
    };
  }

  revalidatePath(`/house/${houseSlug}/meetings`);
  revalidatePath(`/admin/houses/${houseId}?block=meetings`);

  return {
    error: null,
    successMessage: "Ваш голос учтен.",
  };
}
