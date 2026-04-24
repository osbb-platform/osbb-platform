export type DistrictRecord = {
  id: string;
  name: string;
  slug: string;
  theme_color: string;
};

export type ManagementCompanyRecord = {
  id: string;
  slug: string;
  name: string;
  slogan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  work_schedule: string | null;
  is_active: boolean;
};

export type HouseRecord = {
  id: string;
  district_id: string | null;
  management_company_id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  cover_image_path: string | null;
  cover_image_url?: string | null;
  is_active: boolean;
  tariff_amount: number | null;
  district: DistrictRecord | null;
  management_company: ManagementCompanyRecord | null;
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
