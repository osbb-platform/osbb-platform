export type HandlerKey =
  | "requisites"
  | "hero"
  | "board_intro"
  | "home_widgets"
  | "faq"
  | "announcements"
  | "information_posts"
  | "documents"
  | "specialists"
  | "board_members"
  | "reports"
  | "plan"
  | "meetings"
  | "polls"
  | "debtors"
  | "templates";

export type AdminCommand = {
  type: `${HandlerKey}.${string}`;
  payload: Record<string, unknown>;
  houseId: string;
};
