export const HOUSE_MEETING_ENTITY_TYPE = "house_meeting";

export type HouseMeetingLifecycle = "draft" | "published" | "archived";
export type HouseMeetingStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "closed"
  | "cancelled";
export type HouseMeetingDisplayStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "review"
  | "completed"
  | "archived";

export type HouseMeetingQuestionOutcome = "approved" | "rejected" | "pending";
export type HouseMeetingVoteChoice = "for" | "against" | "abstained";

export type HouseMeeting = {
  id: string;
  house_id: string;
  title: string;
  short_description: string;
  agenda: string;
  meeting_date: string | null;
  location: string;
  meeting_status: HouseMeetingStatus;
  display_status: HouseMeetingDisplayStatus;
  protocol_pdf: string;
  protocol_document_id: string;
  lifecycle_status: HouseMeetingLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  legacy_section_id?: string | null;
  legacy_item_index?: number | null;
};

export type HouseMeetingQuestion = {
  id: string;
  meeting_id: string;
  question: string;
  description: string;
  decision_draft: string;
  sort_order: number;
  votes_for: number;
  votes_against: number;
  votes_abstained: number;
  total_apartments_voted: number;
  approval_outcome: HouseMeetingQuestionOutcome;
};

export type HouseMeetingManualVote = {
  id: string;
  meeting_id: string;
  apartment_id: string;
  apartment_label: string;
  question_id: string;
  choice: HouseMeetingVoteChoice;
  recorded_at: string;
};

export type MeetingIdAndLock = {
  id: string;
  lockVersion: number;
};

export type MeetingQuestionPayload = {
  id?: string;
  title?: string;
  question?: string;
  description?: string;
  decisionDraft?: string;
  order?: number;
  sortOrder?: number;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstained?: number;
  totalApartmentsVoted?: number;
  approvalOutcome?: HouseMeetingQuestionOutcome;
};

export type MeetingManualVoteAnswerPayload = {
  questionId: string;
  choice: HouseMeetingVoteChoice;
};

export type MeetingManualVotePayload = {
  apartmentId: string;
  apartmentLabel?: string;
  submittedAt?: string;
  answers: MeetingManualVoteAnswerPayload[];
};

export type CreateMeetingPayload = {
  id?: string;
  title: string;
  shortDescription?: string;
  agenda?: string;
  meetingDateTime?: string | null;
  location?: string;
  status?: HouseMeetingDisplayStatus;
  protocolPdf?: string;
  protocolDocumentId?: string;
  questions?: MeetingQuestionPayload[];
  manualVotes?: MeetingManualVotePayload[];
};

export type UpdateMeetingPayload = CreateMeetingPayload & MeetingIdAndLock;

export type PublishMeetingPayload = MeetingIdAndLock & {
  status?: Exclude<HouseMeetingDisplayStatus, "draft" | "archived">;
};

export type ArchiveMeetingPayload = MeetingIdAndLock;

export type RestoreMeetingPayload = MeetingIdAndLock;

export type DeleteMeetingPayload = MeetingIdAndLock;

export type ReplaceMeetingQuestionsPayload = MeetingIdAndLock & {
  questions: MeetingQuestionPayload[];
  manualVotes?: MeetingManualVotePayload[];
};

export type RecordManualVotePayload = MeetingIdAndLock & {
  apartmentId: string;
  answers: MeetingManualVoteAnswerPayload[];
};
