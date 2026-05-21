import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublishedHouseBoardIntro = {
  intro: string;
};

export type PublishedHouseBoardMemberRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";

export type PublishedHouseBoardMember = {
  id: string;
  roleStatus: PublishedHouseBoardMemberRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
  sortOrder: number;
};

export type PublishedHouseBoard = {
  intro: PublishedHouseBoardIntro;
  members: PublishedHouseBoardMember[];
};

type BoardIntroRow = {
  intro: string;
};

type BoardMemberRow = {
  id: string;
  role_status: PublishedHouseBoardMemberRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  office_hours: string;
  description: string;
  sort_order: number;
};

function mapMember(row: BoardMemberRow): PublishedHouseBoardMember {
  return {
    id: row.id,
    roleStatus: row.role_status,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    officeHours: row.office_hours,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

export async function getPublishedHouseBoard(houseId: string): Promise<PublishedHouseBoard> {
  const supabase = await createSupabaseServerClient();

  const { data: intro, error: introError } = await supabase
    .from("house_board_intro")
    .select("intro")
    .eq("house_id", houseId)
    .maybeSingle();

  if (introError) {
    throw new Error(`Failed to load published house board intro: ${introError.message}`);
  }

  const { data: members, error: membersError } = await supabase
    .from("house_board_members")
    .select("id, role_status, name, role, phone, email, office_hours, description, sort_order")
    .eq("house_id", houseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(`Failed to load published house board members: ${membersError.message}`);
  }

  return {
    intro: {
      intro: ((intro as BoardIntroRow | null)?.intro ?? ""),
    },
    members: ((members ?? []) as BoardMemberRow[]).map(mapMember),
  };
}

export async function getChairmanForHouse(houseId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_board_members")
    .select("id, role_status, name, role, phone, email, office_hours, description, sort_order")
    .eq("house_id", houseId)
    .eq("role_status", "chairman")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load house chairman: ${error.message}`);
  }

  return data ? mapMember(data as BoardMemberRow) : null;
}
