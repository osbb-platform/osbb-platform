import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type AdminEmployeeRecord = {
  membershipId: string;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  jobTitle: string | null;
  isActive: boolean;
  invitedAt: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  lastInviteSentAt: string | null;
  createdAt: string | null;
};

type GetAdminEmployeesParams = {
  role?: string | null;
  status?: string | null;
  search?: string | null;
};

function normalizeValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getAdminEmployees(
  params: GetAdminEmployeesParams = {},
): Promise<AdminEmployeeRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const role = normalizeValue(params.role);
    const status = normalizeValue(params.status);
    const search = normalizeValue(params.search)?.toLowerCase() ?? null;

    let query = supabase
      .from("admin_memberships")
      .select(`
        id,
        user_id,
        role,
        status,
        job_title,
        invite_email,
        full_name_snapshot,
        is_active,
        invited_at,
        activated_at,
        archived_at,
        last_invite_sent_at,
        created_at
      `)
      .is("house_id", null)
      .neq("role", ROLES.SUPERADMIN)
      .order("created_at", { ascending: false });

    if (role) {
      query = query.eq("role", role);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: memberships, error: membershipsError } = await query;

    if (membershipsError) {
      console.error("❌ Failed to load admin memberships:", membershipsError.message);
      return [];
    }

    const userIds = Array.from(
      new Set(
        (memberships ?? [])
          .map((item) => item.user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    let profilesMap = new Map<
      string,
      { full_name: string | null; email: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("❌ Failed to load employee profiles:", profilesError.message);
      } else {
        profilesMap = new Map(
          (profiles ?? []).map((profile) => [
            profile.id,
            {
              full_name: profile.full_name ?? null,
              email: profile.email ?? null,
            },
          ]),
        );
      }
    }

    const records: AdminEmployeeRecord[] = (memberships ?? []).map((membership) => {
      const profile = membership.user_id
        ? profilesMap.get(membership.user_id)
        : undefined;

      return {
        membershipId: membership.id,
        userId: membership.user_id ?? null,
        fullName: profile?.full_name ?? membership.full_name_snapshot ?? null,
        email: profile?.email ?? membership.invite_email ?? null,
        role: membership.role ?? null,
        status: membership.status ?? null,
        jobTitle: membership.job_title ?? null,
        isActive: Boolean(membership.is_active),
        invitedAt: membership.invited_at ?? null,
        activatedAt: membership.activated_at ?? null,
        archivedAt: membership.archived_at ?? null,
        lastInviteSentAt: membership.last_invite_sent_at ?? null,
        createdAt: membership.created_at ?? null,
      };
    });

    if (!search) {
      return records;
    }

    return records.filter((record) => {
      const haystack = [
        record.fullName,
        record.email,
        record.jobTitle,
        record.role,
        record.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  } catch (error) {
    console.error("🔥 getAdminEmployees crash:", error);
    return [];
  }
}
