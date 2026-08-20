export const HOUSE_POLL_ENTITY_TYPE = "house_poll";

export type HousePollLifecycle = "draft" | "published" | "archived";
export type HousePollStatus = "idle" | "active" | "completed";
export type HousePollIdentityMode = "open" | "anonymous";
export type HousePollResultsVisibility =
  | "immediate"
  | "after_completion"
  | "hidden";

export type HousePollQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "yes_no"
  | "scale"
  | "free_text";

export type HousePoll = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  identity_mode: HousePollIdentityMode;
  results_visibility: HousePollResultsVisibility;
  poll_status: HousePollStatus;
  lifecycle_status: HousePollLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
};

export type HousePollQuestion = {
  id: string;
  poll_id: string;
  question: string;
  description: string;
  question_type: HousePollQuestionType;
  scale_max: 5 | 10 | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
  is_required: boolean;
  sort_order: number;
};

export type HousePollOption = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number;
};

export type PollIdAndLock = {
  id: string;
  lockVersion: number;
};

export type PollOptionPayload = {
  id?: string;
  label: string;
  sortOrder?: number;
};

export type PollQuestionPayload = {
  id?: string;
  question: string;
  description?: string;
  questionType: HousePollQuestionType;
  scaleMax?: 5 | 10 | null;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  isRequired?: boolean;
  sortOrder?: number;
  options?: PollOptionPayload[];
};

export type CreatePollPayload = {
  title: string;
  description?: string;
  identityMode?: HousePollIdentityMode;
  resultsVisibility?: HousePollResultsVisibility;
  questions: PollQuestionPayload[];
};

export type UpdatePollPayload = PollIdAndLock & {
  title: string;
  description?: string;
  identityMode?: HousePollIdentityMode;
  resultsVisibility?: HousePollResultsVisibility;
};

export type ReplacePollQuestionsPayload = PollIdAndLock & {
  questions: PollQuestionPayload[];
};

export type PublishPollPayload = PollIdAndLock;
export type ArchivePollPayload = PollIdAndLock;
export type RestorePollPayload = PollIdAndLock;
export type DeletePollPayload = PollIdAndLock;
export type OpenPollPayload = PollIdAndLock;
export type ClosePollPayload = PollIdAndLock;
