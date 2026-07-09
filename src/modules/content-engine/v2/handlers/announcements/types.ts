export const HOUSE_ANNOUNCEMENT_ENTITY_TYPE = "house_announcement";
export const HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY = "pdf";
export const HOUSE_ANNOUNCEMENT_BUCKET = "house-announcements";
export const HOUSE_ANNOUNCEMENT_MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

export type AnnouncementLifecycle = "draft" | "published" | "archived";
export type AnnouncementLevel = "info" | "warning" | "danger";

export type HouseAnnouncementFileInput = {
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  uploadedAt?: string | null;
};

export type Announcement = {
  id: string;
  house_id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  lifecycle_status: AnnouncementLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
};

export type AnnouncementIdAndLock = {
  id: string;
  lockVersion: number;
};

export type CreateAnnouncementPayload = {
  id?: string | null;
  title: string;
  body?: string | null;
  level?: AnnouncementLevel | string | null;
  pdf?: HouseAnnouncementFileInput | null;
};

export type UpdateAnnouncementPayload = AnnouncementIdAndLock & {
  title: string;
  body?: string | null;
  level?: AnnouncementLevel | string | null;
  pdf?: HouseAnnouncementFileInput | null;
  removePdf?: boolean;
};

export type ReplaceAnnouncementPdfPayload = AnnouncementIdAndLock & {
  pdf: HouseAnnouncementFileInput;
};

export type RemoveAnnouncementPdfPayload = AnnouncementIdAndLock;
