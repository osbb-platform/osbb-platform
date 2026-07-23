import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";

type AnnouncementFileRow = {
  entity_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
};

export type PublishedHouseAnnouncementPdf = {
  bucket: string;
  path: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
};

export type PublishedHouseAnnouncement = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "danger";
  is_pinned: boolean;
  published_at: string | null;
  updated_at: string;
  pdf: PublishedHouseAnnouncementPdf | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "danger";
  is_pinned: boolean;
  published_at: string | null;
  updated_at: string;
};

function mapPdf(row: AnnouncementFileRow | undefined): PublishedHouseAnnouncementPdf | null {
  if (!row?.storage_bucket || !row.storage_path) {
    return null;
  }

  return {
    bucket: row.storage_bucket,
    path: row.storage_path,
    originalName: row.original_file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    uploadedAt: row.uploaded_at,
  };
}

async function loadPublishedHouseAnnouncements(
  houseId: string,
): Promise<PublishedHouseAnnouncement[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_announcements")
    .select("id, title, body, level, is_pinned, published_at, updated_at")
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("PUBLIC_CONTENT_READ_FAILED", {
      section: "announcements",
      resource: "house_announcements",
      houseId,
      code: error.code,
      message: error.message,
    });

    throw new Error(
      `Failed to load published announcements for house ${houseId}: ${error.message}`,
    );
  }

  const announcements = (data ?? []) as unknown as AnnouncementRow[];
  const announcementIds = announcements.map((announcement) => announcement.id);
  let filesByAnnouncementId = new Map<string, AnnouncementFileRow>();

  if (announcementIds.length > 0) {
    const { data: files, error: filesError } = await supabase
      .from("house_content_files")
      .select(
        [
          "entity_id",
          "storage_bucket",
          "storage_path",
          "original_file_name",
          "mime_type",
          "size_bytes",
          "uploaded_at",
        ].join(", "),
      )
      .eq("entity_type", "house_announcement")
      .eq("field_key", "pdf")
      .in("entity_id", announcementIds);

    if (filesError) {
      console.error("PUBLIC_CONTENT_OPTIONAL_READ_FAILED", {
        section: "announcements",
        resource: "house_content_files",
        houseId,
        code: filesError.code,
        message: filesError.message,
      });
    } else {
      filesByAnnouncementId = new Map(
        ((files ?? []) as unknown as AnnouncementFileRow[]).map((file) => [
          file.entity_id,
          file,
        ]),
      );
    }
  }

  return announcements.map((announcement) => ({
    ...announcement,
    pdf: mapPdf(filesByAnnouncementId.get(announcement.id)),
  }));
}

export const getPublishedHouseAnnouncements = cache(
  async (houseId: string): Promise<PublishedHouseAnnouncement[]> => {
    return unstable_cache(
      () => loadPublishedHouseAnnouncements(houseId),
      ["published-house-announcements-v2", houseId],
      {
        tags: [`house:${houseId}:announcements`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
