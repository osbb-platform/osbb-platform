import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHouseBoardIntro = {
  id: string;
  houseId: string;
  intro: string;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminHouseBoardMemberRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";

export type AdminHouseBoardMember = {
  id: string;
  houseId: string;
  roleStatus: AdminHouseBoardMemberRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
  sortOrder: number;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminHouseBoard = {
  intro: AdminHouseBoardIntro;
  members: AdminHouseBoardMember[];
};

type BoardIntroRow = {
  id: string;
  house_id: string;
  intro: string;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

type BoardMemberRow = {
  id: string;
  house_id: string;
  role_status: AdminHouseBoardMemberRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  office_hours: string;
  description: string;
  sort_order: number;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

function mapIntro(row: BoardIntroRow): AdminHouseBoardIntro {
  return {
    id: row.id,
    houseId: row.house_id,
    intro: row.intro,
    lockVersion: row.lock_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: BoardMemberRow): AdminHouseBoardMember {
  return {
    id: row.id,
    houseId: row.house_id,
    roleStatus: row.role_status,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    officeHours: row.office_hours,
    description: row.description,
    sortOrder: row.sort_order,
    lockVersion: row.lock_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAdminHouseBoard(houseId: string): Promise<AdminHouseBoard> {
  const supabase = await createSupabaseServerClient();

  const { data: existingIntro, error: introError } = await supabase
    .from("house_board_intro")
    .select("*")
    .eq("house_id", houseId)
    .maybeSingle();

  if (introError) {
    throw new Error(`Failed to load house board intro: ${introError.message}`);
  }

  let introRow = existingIntro as BoardIntroRow | null;

  if (!introRow) {
    const { data: createdIntro, error: createIntroError } = await supabase
      .from("house_board_intro")
      .insert({
        house_id: houseId,
      })
      .select("*")
      .single();

    if (createIntroError || !createdIntro) {
      throw new Error(
        `Failed to create house board intro: ${createIntroError?.message ?? "Unknown error"}`,
      );
    }

    introRow = createdIntro as BoardIntroRow;
  }

  const { data: members, error: membersError } = await supabase
    .from("house_board_members")
    .select("*")
    .eq("house_id", houseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(`Failed to load house board members: ${membersError.message}`);
  }

  return {
    intro: mapIntro(introRow),
    members: ((members ?? []) as BoardMemberRow[]).map(mapMember),
  };
}
