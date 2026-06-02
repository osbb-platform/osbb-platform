export const VISITOR_EVENT_TYPES = [
  "site_visit",
  "password_success",
  "password_fail",
  "section_view",
  "contact_request_submitted",
  "document_open",
] as const;

export type VisitorEventType = (typeof VISITOR_EVENT_TYPES)[number];
