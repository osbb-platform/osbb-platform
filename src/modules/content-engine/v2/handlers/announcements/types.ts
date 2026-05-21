export type AnnouncementLevel = 'info' | 'warning' | 'danger';
export type AnnouncementLifecycle = 'draft' | 'published' | 'archived';

export type Announcement = {
  id: string;
  house_id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  lifecycle_status: AnnouncementLifecycle;
  lock_version: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
};

export type CreateAnnouncementPayload = {
  title: string;
  body: string;
  level: AnnouncementLevel;
};

export type UpdateAnnouncementPayload = {
  id: string;
  lockVersion: number;
  title: string;
  body: string;
  level: AnnouncementLevel;
};

export type AnnouncementIdAndLock = {
  id: string;
  lockVersion: number;
};
