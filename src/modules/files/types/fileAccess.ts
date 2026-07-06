export const FILE_ENTITY_TYPES = [
  "house_report",
  "house_document",
  "house_plan_task",
  "house_meeting",
  "house_announcement_pdf",
] as const;

export type FileEntityType = (typeof FILE_ENTITY_TYPES)[number];
