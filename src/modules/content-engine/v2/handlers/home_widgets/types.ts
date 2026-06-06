export type HomeWidget = {
  id: string;
  label: string;
  value: string;
};

export type HouseHomeWidgets = {
  id: string;
  house_id: string;
  status_widgets: HomeWidget[];
  lock_version: number;
  created_at: string;
  updated_at: string;
};

export type SaveHomeWidgetsPayload = {
  lockVersion: number;
  statusWidgets: HomeWidget[];
};
