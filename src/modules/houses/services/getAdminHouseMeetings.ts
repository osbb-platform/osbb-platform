import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HouseMeeting,
  HouseMeetingDisplayStatus,
  HouseMeetingManualVote,
  HouseMeetingQuestion,
  HouseMeetingQuestionOutcome,
  HouseMeetingVoteChoice,
} from "@/src/modules/content-engine/v2/handlers/meetings";
import {
  collapseMeetingManualVoteRows,
} from "@/src/modules/houses/utils/meetingApartmentIdentity";
import {
  getAdminOnlineMeetingVoting,
  type AdminOnlineMeetingBallot,
} from "@/src/modules/houses/services/getAdminOnlineMeetingVoting";
import type { OnlineMeetingAggregation } from "@/src/modules/houses/services/getOnlineMeetingAggregation";

export type HouseMeetingsQuestionSnapshot = {
  id: string;
  order: number;
  title: string;
  description: string;
  decisionDraft: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstained: number;
  totalApartmentsVoted: number;
  approvalOutcome: HouseMeetingQuestionOutcome;
};

export type HouseMeetingsManualVoteAnswerSnapshot = {
  questionId: string;
  choice: HouseMeetingVoteChoice;
};

export type HouseMeetingsManualVoteSnapshot = {
  apartmentId: string;
  apartmentLabel: string;
  submittedAt: string;
  answers: HouseMeetingsManualVoteAnswerSnapshot[];
};

export type HouseMeetingsItemSnapshot = {
  id: string;
  title: string;
  shortDescription: string;
  meetingDateTime: string;
  location: string;
  status: HouseMeetingDisplayStatus;
  votingMode: "manual" | "online";
  lifecycleStatus: "draft" | "published" | "archived";
  lockVersion: number;
  updatedAt: string;
  protocolPdf: string;
  protocolDocumentId: string;
  questions: HouseMeetingsQuestionSnapshot[];
  manualVotes: HouseMeetingsManualVoteSnapshot[];
  onlineAggregation: OnlineMeetingAggregation | null;
  onlineBallots: AdminOnlineMeetingBallot[];
};

export type AdminHouseMeetingsSnapshot = {
  items: HouseMeetingsItemSnapshot[];
  updatedAt: string | null;
};

type LoadMeetingsRowsParams = {
  houseId: string;
  publishedOnly?: boolean;
};

function mapQuestion(question: HouseMeetingQuestion): HouseMeetingsQuestionSnapshot {
  return {
    id: question.id,
    order: question.sort_order,
    title: question.question,
    description: question.description,
    decisionDraft: question.decision_draft,
    votesFor: question.votes_for,
    votesAgainst: question.votes_against,
    votesAbstained: question.votes_abstained,
    totalApartmentsVoted: question.total_apartments_voted,
    approvalOutcome: question.approval_outcome,
  };
}

function mapManualVotes(
  votes: HouseMeetingManualVote[],
): HouseMeetingsManualVoteSnapshot[] {
  return collapseMeetingManualVoteRows(votes);
}

function mapMeeting(params: {
  meeting: HouseMeeting;
  questions: HouseMeetingQuestion[];
  manualVotes: HouseMeetingManualVote[];
}): HouseMeetingsItemSnapshot {
  const { meeting, questions, manualVotes } = params;

  return {
    id: meeting.id,
    title: meeting.title,
    shortDescription: meeting.short_description,
    meetingDateTime: meeting.meeting_date ?? "",
    location: meeting.location,
    status: meeting.display_status,
    votingMode: meeting.voting_mode,
    lifecycleStatus: meeting.lifecycle_status,
    lockVersion: meeting.lock_version,
    updatedAt: meeting.updated_at,
    protocolPdf: meeting.protocol_pdf,
    protocolDocumentId: meeting.protocol_document_id,
    questions: questions
      .filter((question) => question.meeting_id === meeting.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(mapQuestion),
    manualVotes: mapManualVotes(
      manualVotes.filter((vote) => vote.meeting_id === meeting.id),
    ),
    onlineAggregation: null,
    onlineBallots: [],
  };
}

async function loadMeetingsRows(params: LoadMeetingsRowsParams) {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("house_meetings")
    .select("*")
    .eq("house_id", params.houseId)
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (params.publishedOnly) {
    query = query.eq("lifecycle_status", "published");
  }

  const { data: meetingsData, error: meetingsError } = await query;

  if (meetingsError) {
    throw new Error(`Failed to load house meetings: ${meetingsError.message}`);
  }

  const meetings = (meetingsData ?? []) as unknown as HouseMeeting[];
  const meetingIds = meetings.map((meeting) => meeting.id);

  if (meetingIds.length === 0) {
    return {
      meetings,
      questions: [] as HouseMeetingQuestion[],
      manualVotes: [] as HouseMeetingManualVote[],
    };
  }

  const [questionsResult, manualVotesResult] = await Promise.all([
    supabase
      .from("house_meeting_questions")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("house_meeting_manual_votes")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("recorded_at", { ascending: true }),
  ]);

  if (questionsResult.error) {
    throw new Error(
      `Failed to load house meeting questions: ${questionsResult.error.message}`,
    );
  }

  if (manualVotesResult.error) {
    throw new Error(
      `Failed to load house meeting manual votes: ${manualVotesResult.error.message}`,
    );
  }

  return {
    meetings,
    questions: (questionsResult.data ?? []) as unknown as HouseMeetingQuestion[],
    manualVotes: (manualVotesResult.data ?? []) as unknown as HouseMeetingManualVote[],
  };
}

export async function getAdminHouseMeetings(params: {
  houseId: string;
}): Promise<AdminHouseMeetingsSnapshot> {
  noStore();

  try {
    const rows = await loadMeetingsRows({
      houseId: params.houseId,
      publishedOnly: false,
    });

    const baseItems = rows.meetings.map((meeting) =>
      mapMeeting({
        meeting,
        questions: rows.questions,
        manualVotes: rows.manualVotes,
      }),
    );

    const items = await Promise.all(
      baseItems.map(async (item) => {
        if (item.votingMode !== "online") {
          return item;
        }

        const online = await getAdminOnlineMeetingVoting({
          houseId: params.houseId,
          meetingId: item.id,
        });

        return {
          ...item,
          onlineAggregation: online.aggregation,
          onlineBallots: online.ballots,
        };
      }),
    );

    return {
      items,
      updatedAt:
        items.length > 0
          ? items.map((item) => item.updatedAt).sort().at(-1) ?? null
          : null,
    };
  } catch (error) {
    console.error(
      "Failed to load admin house meetings:",
      error instanceof Error ? error.message : error,
    );

    return {
      items: [],
      updatedAt: null,
    };
  }
}

export async function loadPublishedHouseMeetingsRows(houseId: string) {
  return loadMeetingsRows({
    houseId,
    publishedOnly: true,
  });
}

export function mapHouseMeetingSnapshot(params: {
  meeting: HouseMeeting;
  questions: HouseMeetingQuestion[];
  manualVotes: HouseMeetingManualVote[];
}) {
  return mapMeeting(params);
}
