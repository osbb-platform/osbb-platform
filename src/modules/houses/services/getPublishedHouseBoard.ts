import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  logOptionalPublicReadError,
  throwRequiredPublicReadError,
} from "./publicContentResilience";

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
  updatedAt: string;
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
  updated_at: string;
};

function emptyBoard(): PublishedHouseBoard {
  return {
    intro: {
      intro: "",
    },
    members: [],
  };
}

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
    updatedAt: row.updated_at,
  };
}

async function loadPublishedHouseBoard(houseId: string): Promise<PublishedHouseBoard> {
  const supabase = createSupabasePublicClient();

  const { data: intro, error: introError } = await supabase
    .from("house_board_intro")
    .select("intro")
    .eq("house_id", houseId)
    .maybeSingle();

  if (introError) {
    logOptionalPublicReadError({
      section: "board",
      resource: "house_board_intro",
      houseId,
      error: introError,
    });
  }

  const { data: members, error: membersError } = await supabase
    .from("house_board_members")
    .select("id, role_status, name, role, phone, email, office_hours, description, sort_order, updated_at")
    .eq("house_id", houseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (membersError) {
    throwRequiredPublicReadError({
      section: "board",
      resource: "house_board_members",
      houseId,
      error: membersError,
    });
  }

  return {
    intro: {
      intro: ((intro as BoardIntroRow | null)?.intro ?? ""),
    },
    members: ((members ?? []) as BoardMemberRow[]).map(mapMember),
  };
}

async function loadChairmanForHouse(houseId: string) {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_board_members")
    .select("id, role_status, name, role, phone, email, office_hours, description, sort_order, updated_at")
    .eq("house_id", houseId)
    .eq("role_status", "chairman")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwRequiredPublicReadError({
      section: "board",
      resource: "house_board_members_chairman",
      houseId,
      error,
    });
  }

  return data ? mapMember(data as BoardMemberRow) : null;
}

export const getPublishedHouseBoard = cache(
  async (houseId: string): Promise<PublishedHouseBoard> => {
    return unstable_cache(
      () => loadPublishedHouseBoard(houseId),
      ["published-house-board-v2", houseId],
      {
        tags: [`house:${houseId}:board`, `house:${houseId}:board_members`, `house:${houseId}:board_intro`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);

export const getChairmanForHouse = cache(async (houseId: string) => {
  return unstable_cache(
    () => loadChairmanForHouse(houseId),
    ["public-house-chairman-v2", houseId],
    {
      tags: [`house:${houseId}:board`, `house:${houseId}:board_members`, `house:${houseId}`],
      revalidate: 300,
    },
  )();
});
