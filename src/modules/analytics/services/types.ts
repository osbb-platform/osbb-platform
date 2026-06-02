export type AnalyticsFilter = {
  houseId?: string;
  from: string;
  to: string;
};

export type AnalyticsHouseOption = {
  id: string;
  name: string;
  slug: string;
};

export type AnalyticsKpi = {
  uniqueSessions: number;
  totalVisits: number;
  passwordSuccess: number;
  passwordFail: number;
  passwordSuccessRate: number;
  sectionViews: number;
  documentOpens: number;
  contactRequests: number;
};

export type AnalyticsDailyPoint = {
  date: string;
  totalEvents: number;
  visits: number;
  sectionViews: number;
  passwordSuccess: number;
  passwordFail: number;
  contactRequests: number;
};

export type AnalyticsTopHouse = {
  houseId: string;
  houseName: string;
  houseSlug: string;
  totalEvents: number;
  uniqueSessions: number;
};

export type AnalyticsOverview = {
  kpi: AnalyticsKpi;
  daily: AnalyticsDailyPoint[];
  topHouses: AnalyticsTopHouse[];
};

export type AnalyticsSectionItem = {
  sectionKey: string;
  views: number;
  share: number;
};

export type AnalyticsAccessDailyPoint = {
  date: string;
  success: number;
  fail: number;
};

export type AnalyticsAccessHourPoint = {
  hour: number;
  success: number;
  fail: number;
  total: number;
};

export type AnalyticsAccess = {
  daily: AnalyticsAccessDailyPoint[];
  hourly: AnalyticsAccessHourPoint[];
};

export type AnalyticsRequestItem = {
  id: string;
  createdAt: string;
  houseId: string;
  houseSlug: string;
  specialistLabel: string;
  requesterName: string;
  apartment: string;
  status: string;
  subject: string;
};

export type AnalyticsRequests = {
  total: number;
  latest: AnalyticsRequestItem[];
};

export type HouseVisitorEventRow = {
  id: string;
  occurred_at: string;
  house_id: string;
  session_id: string;
  event_type:
    | "site_visit"
    | "password_success"
    | "password_fail"
    | "section_view"
    | "contact_request_submitted"
    | "document_open";
  section_key: string | null;
};

export const EMPTY_KPI: AnalyticsKpi = {
  uniqueSessions: 0,
  totalVisits: 0,
  passwordSuccess: 0,
  passwordFail: 0,
  passwordSuccessRate: 0,
  sectionViews: 0,
  documentOpens: 0,
  contactRequests: 0,
};

export const EMPTY_OVERVIEW: AnalyticsOverview = {
  kpi: EMPTY_KPI,
  daily: [],
  topHouses: [],
};

export const EMPTY_ACCESS: AnalyticsAccess = {
  daily: [],
  hourly: [],
};

export const EMPTY_REQUESTS: AnalyticsRequests = {
  total: 0,
  latest: [],
};
