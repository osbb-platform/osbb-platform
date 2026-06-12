export const HOUSE_SPECIALIST_ENTITY_TYPE = "house_specialist";

export type HouseSpecialistLifecycle = "draft" | "published" | "archived";
export type HouseSpecialistPhoneType = "mobile" | "landline" | "free" | "other";

export type HouseSpecialist = {
  id: string;
  house_id: string;
  title: string;
  category: string;
  phones: string[];
  phone_types: HouseSpecialistPhoneType[];
  email: string;
  description: string;
  sort_order: number;
  lifecycle_status: HouseSpecialistLifecycle;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
};

export type HouseSpecialistCategory = {
  id: string;
  house_id: string;
  title: string;
  sort_order: number;
};

export type SpecialistIdAndLock = {
  id: string;
  lockVersion: number;
};

export type CreateSpecialistPayload = {
  title: string;
  category?: string;
  phones?: string[];
  phoneTypes?: HouseSpecialistPhoneType[];
  email?: string;
  description?: string;
  sortOrder?: number;
};

export type UpdateSpecialistPayload = CreateSpecialistPayload & SpecialistIdAndLock;

export type DeleteSpecialistPayload = SpecialistIdAndLock;

export type CategoriesUpsertSpecialistsPayload = {
  categories: Array<{
    id?: string;
    title: string;
    sortOrder?: number;
  }>;
};
