export type HouseHero = {
  id: string;
  house_id: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cover_image_url: string | null;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

export type SaveHeroPayload = {
  lockVersion: number;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  coverImageUrl?: string | null;
};
