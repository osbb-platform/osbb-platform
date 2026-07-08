export type MeetingApartmentOption = {
  id: string;
  apartmentLabel: string;
  ownerName?: string | null;
};

export type MeetingApartmentVoteIdentity = {
  apartmentId: string;
  apartmentLabel: string;
};

export type MeetingManualVoteRow<TChoice extends string> = {
  apartment_id: string;
  apartment_label: string;
  question_id: string;
  choice: TChoice;
  recorded_at: string;
};

export type CollapsedMeetingManualVote<TChoice extends string> = {
  apartmentId: string;
  apartmentLabel: string;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    choice: TChoice;
  }>;
};

export function normalizeMeetingApartmentLabel(label: string) {
  const trimmed = label
    .normalize("NFKC")
    .replace(/\u00a0/gu, " ")
    .trim();
  const withoutPrefix = trimmed
    .replace(/^(кв\.?|квартира|прим\.?)\s*/iu, "")
    .trim();
  const withoutOwner = withoutPrefix.replace(/\s+—.*$/u, "").trim();

  return withoutOwner || withoutPrefix || trimmed;
}

export function getMeetingApartmentKey(label: string) {
  return normalizeMeetingApartmentLabel(label)
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("uk-UA")
    .trim();
}

export function findMeetingApartmentForVote(
  vote: MeetingApartmentVoteIdentity,
  apartments: MeetingApartmentOption[],
) {
  const exactMatch = apartments.find((item) => item.id === vote.apartmentId);

  if (exactMatch) {
    return exactMatch;
  }

  const voteKey = getMeetingApartmentKey(vote.apartmentLabel);

  if (!voteKey) {
    return undefined;
  }

  return apartments.find(
    (item) => getMeetingApartmentKey(item.apartmentLabel) === voteKey,
  );
}

export function getAvailableMeetingApartments(
  apartments: MeetingApartmentOption[],
  votes: MeetingApartmentVoteIdentity[],
) {
  const votedIds = new Set(votes.map((vote) => vote.apartmentId).filter(Boolean));
  const votedKeys = new Set(
    votes
      .map((vote) => getMeetingApartmentKey(vote.apartmentLabel))
      .filter(Boolean),
  );

  return apartments.filter(
    (apartment) =>
      !votedIds.has(apartment.id) &&
      !votedKeys.has(getMeetingApartmentKey(apartment.apartmentLabel)),
  );
}

export function collapseMeetingManualVoteRows<TChoice extends string>(
  votes: MeetingManualVoteRow<TChoice>[],
): CollapsedMeetingManualVote<TChoice>[] {
  const grouped = new Map<
    string,
    CollapsedMeetingManualVote<TChoice> & {
      answersByQuestion: Map<
        string,
        CollapsedMeetingManualVote<TChoice>["answers"][number]
      >;
    }
  >();

  for (const vote of votes) {
    const apartmentLabel = normalizeMeetingApartmentLabel(vote.apartment_label);
    const apartmentKey =
      getMeetingApartmentKey(vote.apartment_label) || `id:${vote.apartment_id}`;
    const existing =
      grouped.get(apartmentKey) ??
      {
        apartmentId: vote.apartment_id,
        apartmentLabel,
        submittedAt: vote.recorded_at,
        answers: [],
        answersByQuestion: new Map(),
      };

    existing.answersByQuestion.set(vote.question_id, {
      questionId: vote.question_id,
      choice: vote.choice,
    });

    if (vote.recorded_at >= existing.submittedAt) {
      existing.apartmentId = vote.apartment_id;
      existing.apartmentLabel = apartmentLabel;
      existing.submittedAt = vote.recorded_at;
    }

    grouped.set(apartmentKey, existing);
  }

  return Array.from(grouped.values())
    .map(({ answersByQuestion, ...vote }) => ({
      ...vote,
      answers: Array.from(answersByQuestion.values()),
    }))
    .sort((left, right) =>
      left.apartmentLabel.localeCompare(right.apartmentLabel, "uk", {
        numeric: true,
      }),
    );
}
