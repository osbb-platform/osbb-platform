export type FaqLifecycle = "draft" | "published" | "archived";

export type HouseFaq = {
  id: string;
  house_id: string;
  lifecycle_status: FaqLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
};

export type HouseFaqItem = {
  id: string;
  faq_id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type FaqItemInput = {
  question: string;
  answer: string;
};

export type FaqTargetPayload = {
  faqId: string;
};

export type FaqLockPayload = FaqTargetPayload & {
  lockVersion: number;
};

export type ReplaceFaqItemsPayload = FaqLockPayload & {
  items: FaqItemInput[];
};

export type CreateFaqPayload = {
  sourceFaqId?: string;
};
