export type HouseBoardIntro = {
  id: string;
  house_id: string;
  intro: string;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

export type SaveBoardIntroPayload = {
  lockVersion: number;
  intro: string;
};
