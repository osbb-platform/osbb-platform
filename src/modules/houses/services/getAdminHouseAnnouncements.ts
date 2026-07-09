import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  Announcement,
  HouseAnnouncementFileInput,
} from "@/src/modules/content-engine/v2/handlers/announcements/types";

type AnnouncementFileRow = {
  entity_id: string;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
};

export type AdminHouseAnnouncement = Announcement & {
  pdf: HouseAnnouncementFileInput | null;
};

function mapFile(row: AnnouncementFileRow | undefined): HouseAnnouncementFileInput | null {
  if (!row?.storage_bucket || !row.storage_path) {
    return null;
  }

  return {
    bucket: row.storage_bucket,
    path: row.storage_path,
    originalName: row.original_file_name,
    mimeType: row.mime_type ?? "application/pdf",
    size: row.size_bytes,
    uploadedAt: row.uploaded_at,
  };
}

export async function getAdminHouseAnnouncements(params: {
  houseId: string;
}): Promise<AdminHouseAnnouncement[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_announcements")
    .select("*")
    .eq("house_id", params.houseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load admin announcements:", error.message);
    return [];
  }

  const announcements = (data ?? []) as unknown as Announcement[];
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
      console.error("Failed to load admin announcement files:", {
        houseId: params.houseId,
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
    pdf: mapFile(filesByAnnouncementId.get(announcement.id)),
  }));
}
