export const INFORMATION_POST_CATEGORIES = [
  "Про будинок",
  "Правила проживання",
  "Корисна інформація",
  "Контакти служб",
  "Інструкції для мешканців",
] as const;

export type InformationPostCategory = (typeof INFORMATION_POST_CATEGORIES)[number];
export type InformationPostLifecycle = "draft" | "published" | "archived";

export type InformationPostFileInput = {
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type InformationPost = {
  id: string;
  house_id: string;
  headline: string;
  body: string;
  category: InformationPostCategory;
  is_pinned: boolean;
  lifecycle_status: InformationPostLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
};

export type CreateInformationPostPayload = {
  headline: string;
  body: string;
  category: InformationPostCategory;
  isPinned?: boolean;
  coverImage?: InformationPostFileInput | null;
};

export type UpdateInformationPostPayload = {
  id: string;
  lockVersion: number;
  headline: string;
  body: string;
  category: InformationPostCategory;
  isPinned?: boolean;
  coverImage?: InformationPostFileInput | null;
  removeCoverImage?: boolean;
};

export type InformationPostIdAndLock = {
  id: string;
  lockVersion: number;
};
