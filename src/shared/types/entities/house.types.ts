export type DistrictRecord = {
  id: string;
  name: string;
  slug: string;
  theme_color: string;
};

export type HouseRecord = {
  id: string;
  district_id: string | null;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  is_active: boolean;
  district: DistrictRecord | null;
};

export type HousePageRecord = {
  id: string;
  house_id: string;
  slug: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
};

export type HouseSectionRecord = {
  id: string;
  house_page_id: string;
  kind:
    | "hero"
    | "rich_text"
    | "contacts"
    | "faq"
    | "announcements"
    | "documents"
    | "reports"
    | "debtors"
    | "meetings"
    | "requisites"
    | "important_info"
    | "specialists"
    | "plan"
    | "custom";
  title: string | null;
  sort_order: number;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};
